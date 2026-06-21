package vuln

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/deptic-io/api/internal/scanner"
	"golang.org/x/mod/semver"
	"github.com/redis/go-redis/v9"
)

var (
	osvSem      = make(chan struct{}, 5) // max 5 concurrent OSV requests
	osvDelay    = 200 * time.Millisecond
	resolverRdb *redis.Client
)

func InitResolver(rdb *redis.Client) {
	resolverRdb = rdb
}

// isVersionClean checks OSV to see if a specific version has known vulnerabilities
func isVersionClean(ctx context.Context, pkgName, ecosystem, version string) (bool, error) {
	osvSem <- struct{}{}
	defer func() { <-osvSem }()
	time.Sleep(osvDelay)

	vulns, err := QueryOSV(ctx, pkgName, version, ecosystem)
	if err != nil {
		return false, err
	}
	return len(vulns) == 0, nil
}

func isPreRelease(v string) bool {
	vLower := strings.ToLower(v)
	return strings.Contains(vLower, "alpha") ||
		strings.Contains(vLower, "beta") ||
		strings.Contains(vLower, "rc") ||
		strings.Contains(vLower, "next") ||
		strings.Contains(vLower, "m") ||
		strings.Contains(vLower, "snapshot")
}

// QueryOSVAll gets ALL vulnerabilities for a package across all versions
func QueryOSVAll(ctx context.Context, pkgName, ecosystem string) ([]osvResponse, error) {
	cacheKey := fmt.Sprintf("osv-all:%s:%s", ecosystem, pkgName)
	if resolverRdb != nil {
		if val, err := resolverRdb.Get(ctx, cacheKey).Result(); err == nil && val != "" {
			var vulns []osvResponse
			if json.Unmarshal([]byte(val), &vulns) == nil {
				return vulns, nil
			}
		}
	}

	ecoMap := map[string]string{
		"npm":   "npm",
		"pip":   "PyPI",
		"maven": "Maven",
	}

	mappedEco, ok := ecoMap[ecosystem]
	if !ok {
		mappedEco = ecosystem
	}

	// Omit version to get ALL vulnerabilities for this package
	reqBody := map[string]interface{}{
		"package": map[string]string{
			"name":      pkgName,
			"ecosystem": mappedEco,
		},
	}

	b, _ := json.Marshal(reqBody)

	osvSem <- struct{}{}
	defer func() { <-osvSem }()
	time.Sleep(osvDelay)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.osv.dev/v1/query", strings.NewReader(string(b)))
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("osv returned status %d for package %s", resp.StatusCode, pkgName)
	}

	var data osvResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	if resolverRdb != nil {
		if b, err := json.Marshal([]osvResponse{data}); err == nil {
			resolverRdb.Set(ctx, cacheKey, string(b), 2*time.Hour)
		}
	}

	return []osvResponse{data}, nil
}

func getAffectedVersions(vulns []osvResponse) map[string]bool {
	affected := make(map[string]bool)
	for _, vResp := range vulns {
		for _, vuln := range vResp.Vulns {
			for _, affectedPkg := range vuln.Affected {
				for _, v := range affectedPkg.Versions {
					affected[v] = true
				}
			}
		}
	}
	return affected
}

// FindCleanVersion finds the latest version of a package that has ZERO known CVEs
func FindCleanVersion(ctx context.Context, pkgName, ecosystem string) (string, error) {
	cacheKey := fmt.Sprintf("clean-version:%s:%s", ecosystem, pkgName)
	if resolverRdb != nil {
		if val, err := resolverRdb.Get(ctx, cacheKey).Result(); err == nil && val != "" {
			return val, nil
		}
	}

	var allVersions []string
	var err error

	// Step 1: Get all available versions from registry
	switch strings.ToLower(ecosystem) {
	case "npm":
		allVersions, err = fetchAllVersionsNPM(ctx, pkgName)
	case "pip":
		allVersions, err = fetchAllVersionsPyPI(ctx, pkgName)
	case "maven":
		allVersions, err = fetchAllVersionsMaven(ctx, pkgName)
	case "go":
		allVersions, err = fetchAllVersionsGo(ctx, pkgName)
	default:
		return "", fmt.Errorf("unsupported ecosystem: %s", ecosystem)
	}

	if err != nil {
		return "", err
	}
	
	if len(allVersions) == 0 {
		return "", fmt.Errorf("no versions found for %s", pkgName)
	}

	// Step 2: Fetch all CVEs for this package to build affected set
	vulns, err := QueryOSVAll(ctx, pkgName, ecosystem)
	if err != nil {
		// Fallback to naive check
		return naiveFindCleanVersion(ctx, pkgName, ecosystem, allVersions)
	}
	affectedSet := getAffectedVersions(vulns)

	// Step 3: Find latest version not in affected set
	var cleanVersion string
	for _, v := range allVersions {
		if !affectedSet[v] {
			// Step 4: Double verify with OSV query specific to this version
			isClean, _ := isVersionClean(ctx, pkgName, ecosystem, v)
			if isClean {
				cleanVersion = v
				break
			}
		}
	}
	
	if cleanVersion == "" {
		// If we couldn't find a clean version, return the latest as fallback
		cleanVersion = allVersions[0]
		err = fmt.Errorf("checked all versions, none clean. returning latest stable: %s", cleanVersion)
	}

	if resolverRdb != nil && err == nil {
		resolverRdb.Set(ctx, cacheKey, cleanVersion, 6*time.Hour)
	}

	return cleanVersion, err
}

func naiveFindCleanVersion(ctx context.Context, pkgName, ecosystem string, versions []string) (string, error) {
	checked := 0
	for _, v := range versions {
		if checked >= 20 {
			break
		}
		clean, err := isVersionClean(ctx, pkgName, ecosystem, v)
		if err == nil && clean {
			return v, nil
		}
		checked++
	}
	return versions[0], fmt.Errorf("checked 20 versions natively, none clean. returning latest: %s", versions[0])
}

func fetchAllVersionsNPM(ctx context.Context, pkgName string) ([]string, error) {
	escapedName := strings.ReplaceAll(url.QueryEscape(pkgName), "%40", "@")
	apiURL := fmt.Sprintf("https://registry.npmjs.org/%s", escapedName)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("npm registry returned %d for %s", resp.StatusCode, pkgName)
	}

	var data struct {
		Versions map[string]interface{} `json:"versions"`
		DistTags map[string]string      `json:"dist-tags"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	var versions []string
	for v := range data.Versions {
		if !isPreRelease(v) {
			versions = append(versions, v)
		}
	}

	sort.Slice(versions, func(i, j int) bool {
		v1 := "v" + versions[i]
		v2 := "v" + versions[j]
		if !semver.IsValid(v1) || !semver.IsValid(v2) {
			return versions[i] > versions[j]
		}
		return semver.Compare(v1, v2) > 0
	})

	if len(versions) == 0 && data.DistTags["latest"] != "" {
		versions = append(versions, data.DistTags["latest"])
	}

	return versions, nil
}

func fetchAllVersionsPyPI(ctx context.Context, pkgName string) ([]string, error) {
	apiURL := fmt.Sprintf("https://pypi.org/pypi/%s/json", url.PathEscape(pkgName))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PyPI returned %d for %s", resp.StatusCode, pkgName)
	}

	var data struct {
		Info struct {
			Version string `json:"version"`
		} `json:"info"`
		Releases map[string][]struct {
			Yanked bool `json:"yanked"`
		} `json:"releases"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	var versions []string
	for v, files := range data.Releases {
		if isPreRelease(v) {
			continue
		}
		yanked := false
		if len(files) > 0 && files[0].Yanked {
			yanked = true
		}
		if !yanked {
			versions = append(versions, v)
		}
	}

	sort.Slice(versions, func(i, j int) bool {
		v1 := "v" + versions[i]
		v2 := "v" + versions[j]
		if !semver.IsValid(v1) || !semver.IsValid(v2) {
			return versions[i] > versions[j]
		}
		return semver.Compare(v1, v2) > 0
	})

	if len(versions) == 0 && data.Info.Version != "" {
		versions = append(versions, data.Info.Version)
	}

	return versions, nil
}

func fetchAllVersionsMaven(ctx context.Context, pkgName string) ([]string, error) {
	parts := strings.Split(pkgName, ":")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid Maven package name: %s", pkgName)
	}
	groupID, artifactID := parts[0], parts[1]

	q := url.QueryEscape(fmt.Sprintf("g:%s AND a:%s", groupID, artifactID))
	apiURL := fmt.Sprintf("https://search.maven.org/solrsearch/select?q=%s&rows=100&core=gav&wt=json", q)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "deptic-io-scanner/1.0")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Maven Central returned %d for %s", resp.StatusCode, pkgName)
	}

	var res struct {
		Response struct {
			Docs []struct {
				Version string `json:"v"`
			} `json:"docs"`
		} `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	var versions []string
	for _, doc := range res.Response.Docs {
		if !isPreRelease(doc.Version) {
			versions = append(versions, doc.Version)
		}
	}

	return versions, nil
}

func fetchAllVersionsGo(ctx context.Context, pkgName string) ([]string, error) {
	escapedPath := scanner.EscapePath(pkgName)
	apiURL := fmt.Sprintf("https://proxy.golang.org/%s/@v/list", escapedPath)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Go proxy returned %d for %s", resp.StatusCode, pkgName)
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var versions []string
	lines := strings.Split(string(b), "\n")
	for _, line := range lines {
		v := strings.TrimSpace(line)
		if v != "" && !isPreRelease(v) {
			versions = append(versions, v)
		}
	}

	sort.Slice(versions, func(i, j int) bool {
		v1 := versions[i]
		if !strings.HasPrefix(v1, "v") {
			v1 = "v" + v1
		}
		v2 := versions[j]
		if !strings.HasPrefix(v2, "v") {
			v2 = "v" + v2
		}
		if !semver.IsValid(v1) || !semver.IsValid(v2) {
			return versions[i] > versions[j]
		}
		return semver.Compare(v1, v2) > 0
	})

	return versions, nil
}
