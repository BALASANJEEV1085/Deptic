package vuln

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// FetchLatestVersion returns the current latest stable version of a package from its registry.
// pkgName for Maven should be "groupId:artifactId".
// This is used by Fix PRs to upgrade to the safest available version,
// not just the minimum version that fixes a single CVE.
func FetchLatestVersion(ctx context.Context, pkgName, ecosystem string) (string, error) {
	switch strings.ToLower(ecosystem) {
	case "npm":
		return fetchLatestNPM(ctx, pkgName)
	case "pip":
		return fetchLatestPyPI(ctx, pkgName)
	case "maven":
		return fetchLatestMaven(ctx, pkgName)
	default:
		return "", fmt.Errorf("unsupported ecosystem: %s", ecosystem)
	}
}

// fetchLatestNPM fetches the latest version from the npm registry.
func fetchLatestNPM(ctx context.Context, pkgName string) (string, error) {
	escapedName := strings.ReplaceAll(url.QueryEscape(pkgName), "%40", "@")
	apiURL := fmt.Sprintf("https://registry.npmjs.org/%s/latest", escapedName)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("npm registry returned %d for %s", resp.StatusCode, pkgName)
	}

	var data struct {
		Version string `json:"version"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}
	if data.Version == "" {
		return "", fmt.Errorf("no version found for npm package %s", pkgName)
	}
	return data.Version, nil
}

// fetchLatestPyPI fetches the latest stable version from PyPI.
func fetchLatestPyPI(ctx context.Context, pkgName string) (string, error) {
	apiURL := fmt.Sprintf("https://pypi.org/pypi/%s/json", url.PathEscape(pkgName))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("PyPI returned %d for %s", resp.StatusCode, pkgName)
	}

	var data struct {
		Info struct {
			Version string `json:"version"`
		} `json:"info"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}
	if data.Info.Version == "" {
		return "", fmt.Errorf("no version found for PyPI package %s", pkgName)
	}
	return data.Info.Version, nil
}

// fetchLatestMaven fetches the latest version from Maven Central.
func fetchLatestMaven(ctx context.Context, pkgName string) (string, error) {
	parts := strings.Split(pkgName, ":")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid Maven package name: %s (expected groupId:artifactId)", pkgName)
	}
	groupID, artifactID := parts[0], parts[1]

	q := url.QueryEscape(fmt.Sprintf("g:%s AND a:%s", groupID, artifactID))
	apiURL := fmt.Sprintf("https://search.maven.org/solrsearch/select?q=%s&rows=20&core=gav&wt=json", q)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "deptic-io-scanner/1.0")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Maven Central returned %d for %s", resp.StatusCode, pkgName)
	}

	var res struct {
		Response struct {
			Docs []struct {
				Version string `json:"v"`
			} `json:"docs"`
		} `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if len(res.Response.Docs) == 0 {
		return "", fmt.Errorf("no results found for Maven package %s", pkgName)
	}

	// Filter out pre-releases
	for _, doc := range res.Response.Docs {
		vLower := strings.ToLower(doc.Version)
		if !strings.Contains(vLower, "alpha") &&
			!strings.Contains(vLower, "beta") &&
			!strings.Contains(vLower, "rc") &&
			!strings.Contains(vLower, "m") &&
			!strings.Contains(vLower, "snapshot") {
			return doc.Version, nil
		}
	}

	// Fallback to the first one if all are pre-releases
	return res.Response.Docs[0].Version, nil
}
