package github

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// Client represents a GitHub API client
type Client struct {
	token      string
	httpClient *http.Client
}

// NewClient creates a new GitHub API client
func NewClient(token string) *Client {
	return &Client{
		token:      token,
		httpClient: &http.Client{},
	}
}

// RateLimitError is returned when the GitHub API rate limit is exceeded (HTTP 403)
type RateLimitError struct {
	Message string
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("github api rate limit exceeded: %s", e.Message)
}

// FileEntry represents a file or directory in a GitHub repository
type FileEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"` // "file" or "dir"
}

// Repository represents a GitHub repository
type Repository struct {
	ID              int64  `json:"id"`
	Name            string `json:"name"`
	FullName        string `json:"full_name"`
	HTMLURL         string `json:"html_url"`
	Description     string `json:"description"`
	Private         bool   `json:"private"`
	StargazersCount int    `json:"stargazers_count"`
	Language        string `json:"language"`
	DefaultBranch   string `json:"default_branch"`
	PushedAt        string `json:"pushed_at"`
	UpdatedAt       string `json:"updated_at"`
	Fork            bool   `json:"fork"`
}

type ManifestFile struct {
	Path string // e.g. "backend/pom.xml"
	Type string // "npm" | "pip" | "maven"
	Data []byte // file content
}

// contentResponse represents the response from the GitHub contents API for a single file
type contentResponse struct {
	Type     string `json:"type"`
	Encoding string `json:"encoding"`
	Content  string `json:"content"`
	Message  string `json:"message"`
}

// doRequest performs an HTTP request and sets the necessary GitHub headers
func (c *Client) doRequest(ctx context.Context, req *http.Request) (*http.Response, error) {
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	req = req.WithContext(ctx)
	return c.httpClient.Do(req)
}

func (c *Client) FetchFile(ctx context.Context, owner, repo, filepath string) ([]byte, error) {
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, filepath)
	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.doRequest(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var contentResp contentResponse
		if err := json.NewDecoder(resp.Body).Decode(&contentResp); err != nil {
			return nil, fmt.Errorf("decoding response: %w", err)
		}

		if contentResp.Type != "file" {
			return nil, fmt.Errorf("path is not a file, type is %s", contentResp.Type)
		}

		if contentResp.Encoding != "base64" {
			return nil, fmt.Errorf("unsupported encoding: %s", contentResp.Encoding)
		}

		b64str := strings.ReplaceAll(contentResp.Content, "\n", "")
		decoded, err := base64.StdEncoding.DecodeString(b64str)
		if err != nil {
			return nil, fmt.Errorf("decoding base64 content: %w", err)
		}
		return decoded, nil
	}

	// Fallback to raw.githubusercontent.com for public repos if API fails (e.g. rate limit or 404 due to token issues)
	branches := []string{"main", "master"}
	var lastErr error
	for _, branch := range branches {
		rawURL := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s/%s", owner, repo, branch, filepath)
		rawReq, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		if err != nil {
			continue
		}
		rawResp, err := c.httpClient.Do(rawReq)
		if err != nil {
			lastErr = err
			continue
		}
		defer rawResp.Body.Close()

		if rawResp.StatusCode == http.StatusOK {
			return io.ReadAll(rawResp.Body)
		}
		lastErr = fmt.Errorf("raw github status: %d", rawResp.StatusCode)
	}

	if resp.StatusCode == http.StatusForbidden {
		return nil, &RateLimitError{Message: "rate limit exceeded and fallback failed"}
	}

	return nil, fmt.Errorf("file not found or api error (last raw err: %v)", lastErr)
}

// treeEntry is a single node in the GitHub Git Tree response.
type treeEntry struct {
	Path string `json:"path"`
	Type string `json:"type"` // "blob" or "tree"
}

// treeResponse is the top-level response from the Git Trees API.
type treeResponse struct {
	Tree     []treeEntry `json:"tree"`
	Truncated bool        `json:"truncated"`
}

// FindManifestFile searches the entire repository recursively for a file whose
// base name matches filename, returning the shallowest match (fewest path
// segments). Returns ("", nil, nil) when the file is not present.
func (c *Client) FindManifestFile(ctx context.Context, owner, repo, filename string) (path string, data []byte, err error) {
	treeURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/git/trees/HEAD?recursive=1", owner, repo)
	req, err := http.NewRequest(http.MethodGet, treeURL, nil)
	if err != nil {
		return "", nil, fmt.Errorf("building tree request: %w", err)
	}

	resp, err := c.doRequest(ctx, req)
	if err != nil {
		return "", nil, fmt.Errorf("executing tree request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("git tree api returned %d: %s", resp.StatusCode, string(body))
	}

	var tree treeResponse
	if err := json.NewDecoder(resp.Body).Decode(&tree); err != nil {
		return "", nil, fmt.Errorf("decoding tree response: %w", err)
	}

	// Find all matching blobs, pick the shallowest one (fewest "/" separators).
	bestPath := ""
	bestDepth := -1
	for _, entry := range tree.Tree {
		if entry.Type != "blob" {
			continue
		}
		// Match exact filename or path ending with /filename
		base := entry.Path
		if idx := strings.LastIndex(entry.Path, "/"); idx >= 0 {
			base = entry.Path[idx+1:]
		}
		if base != filename {
			continue
		}
		depth := strings.Count(entry.Path, "/")
		if bestDepth == -1 || depth < bestDepth {
			bestPath = entry.Path
			bestDepth = depth
		}
	}

	if bestPath == "" {
		return "", nil, nil
	}

	fileBytes, err := c.FetchFile(ctx, owner, repo, bestPath)
	if err != nil {
		return "", nil, fmt.Errorf("fetching %s: %w", bestPath, err)
	}
	return bestPath, fileBytes, nil
}

// FindAllManifests recursively traverses the repo and returns all supported manifests.
func (c *Client) FindAllManifests(ctx context.Context, owner, repo string) ([]ManifestFile, error) {
	treeURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/git/trees/HEAD?recursive=1", owner, repo)
	req, err := http.NewRequest(http.MethodGet, treeURL, nil)
	if err != nil {
		return nil, fmt.Errorf("building tree request: %w", err)
	}

	resp, err := c.doRequest(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("executing tree request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("git tree api returned %d: %s", resp.StatusCode, string(body))
	}

	var tree treeResponse
	if err := json.NewDecoder(resp.Body).Decode(&tree); err != nil {
		return nil, fmt.Errorf("decoding tree response: %w", err)
	}

	var manifests []ManifestFile
	skipPatterns := []string{"node_modules", ".git", "dist", "build", "__pycache__", ".venv", "vendor", "target"}

	for _, entry := range tree.Tree {
		if entry.Type != "blob" {
			continue
		}

		// Skip noisy paths
		shouldSkip := false
		for _, p := range skipPatterns {
			if strings.Contains(entry.Path, p) {
				shouldSkip = true
				break
			}
		}
		if shouldSkip {
			continue
		}

		filename := entry.Path
		if idx := strings.LastIndex(entry.Path, "/"); idx >= 0 {
			filename = entry.Path[idx+1:]
		}

		var ecoType string
		depth := strings.Count(entry.Path, "/")

		if filename == "package.json" {
			if depth <= 5 {
				ecoType = "npm"
			}
		} else if filename == "pom.xml" {
			ecoType = "maven"
		} else if filename == "requirements.txt" || filename == "pyproject.toml" || filename == "setup.py" || filename == "Pipfile" {
			ecoType = "pip"
		}

		if ecoType != "" {
			manifests = append(manifests, ManifestFile{
				Path: entry.Path,
				Type: ecoType,
			})
		}

		if len(manifests) >= 30 {
			break
		}
	}

	// Fetch content for each found manifest
	for i := range manifests {
		data, err := c.FetchFile(ctx, owner, repo, manifests[i].Path)
		if err != nil {
			fmt.Printf("Warning: failed to fetch %s: %v\n", manifests[i].Path, err)
			continue
		}
		manifests[i].Data = data
	}

	return manifests, nil
}

// ListFiles lists all files and directories in a specific path of a GitHub repository
func (c *Client) ListFiles(ctx context.Context, owner, repo, path string) ([]FileEntry, error) {
	// If path is empty, we don't append a trailing slash
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents", owner, repo)
	if path != "" {
		apiURL = fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path)
	}

	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.doRequest(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden {
		return nil, &RateLimitError{Message: "rate limit exceeded or access forbidden"}
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var entries []FileEntry
	if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
		// This usually happens if the requested path is a file, so it returns a single object instead of an array
		return nil, fmt.Errorf("decoding response (path might be a file, not a directory): %w", err)
	}

	return entries, nil
}

// ListUserRepositories fetches all repositories accessible by the authenticated user
func (c *Client) ListUserRepositories(ctx context.Context) ([]Repository, error) {
	var allRepos []Repository
	apiURL := "https://api.github.com/user/repos?sort=updated&per_page=100&visibility=all"

	for {
		req, err := http.NewRequest(http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, fmt.Errorf("creating request: %w", err)
		}

		resp, err := c.doRequest(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("executing request: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return nil, fmt.Errorf("github api error %d: %s", resp.StatusCode, string(body))
		}

		var repos []Repository
		if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
			resp.Body.Close()
			return nil, fmt.Errorf("decoding response: %w", err)
		}
		resp.Body.Close()

		allRepos = append(allRepos, repos...)

		// Handle pagination via Link header
		linkHeader := resp.Header.Get("Link")
		nextURL := ""
		if linkHeader != "" {
			links := strings.Split(linkHeader, ",")
			for _, link := range links {
				parts := strings.Split(link, ";")
				if len(parts) == 2 && strings.TrimSpace(parts[1]) == `rel="next"` {
					nextURL = strings.Trim(strings.TrimSpace(parts[0]), "<>")
					break
				}
			}
		}

		if nextURL == "" || len(allRepos) >= 1000 { // limit to 1000 for safety
			break
		}
		apiURL = nextURL
	}

	return allRepos, nil
}

// ParseRepoURL parses a GitHub repository URL and extracts the owner and repo name
func ParseRepoURL(repoURL string) (owner, repo string, err error) {
	repoURL = strings.TrimSpace(repoURL)
	if repoURL == "" {
		return "", "", errors.New("empty url")
	}

	// Accommodate missing scheme
	if !strings.HasPrefix(repoURL, "http://") && !strings.HasPrefix(repoURL, "https://") {
		repoURL = "https://" + repoURL
	}

	u, err := url.Parse(repoURL)
	if err != nil {
		return "", "", fmt.Errorf("invalid url: %w", err)
	}

	if !strings.EqualFold(u.Hostname(), "github.com") && !strings.EqualFold(u.Hostname(), "www.github.com") {
		return "", "", errors.New("not a github url")
	}

	// Clean up path
	path := strings.TrimPrefix(u.Path, "/")
	path = strings.TrimSuffix(path, "/")
	path = strings.TrimSuffix(path, ".git")

	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		return "", "", errors.New("invalid github repository format")
	}

	owner = parts[0]
	repo = parts[1]

	if owner == "" || repo == "" {
		return "", "", errors.New("missing owner or repo")
	}

	return owner, repo, nil
}
