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
