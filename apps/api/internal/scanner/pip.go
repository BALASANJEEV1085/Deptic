package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/pelletier/go-toml/v2"
	"github.com/redis/go-redis/v9"
)

var versionOperatorRegex = regexp.MustCompile(`(==|>=|<=|~=|>|<|!=)(.*)`)

func cleanVersionPip(dep string) (string, string) {
	parts := versionOperatorRegex.Split(dep, 2)
	name := strings.TrimSpace(parts[0])
	version := ""

	matches := versionOperatorRegex.FindStringSubmatch(dep)
	if len(matches) > 2 {
		version = strings.TrimSpace(matches[2])
		if idx := strings.Index(version, ","); idx != -1 {
			version = version[:idx]
		}
		if idx := strings.Index(version, ";"); idx != -1 {
			version = version[:idx]
		}
	}

	if idx := strings.Index(name, "["); idx != -1 {
		name = name[:idx]
	}

	return name, version
}

func ParseRequirementsTxt(data []byte) map[string]string {
	deps := make(map[string]string)
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "-") {
			continue
		}
		name, version := cleanVersionPip(line)
		if name != "" {
			deps[name] = version
		}
	}
	return deps
}

func ParsePyprojectToml(data []byte) map[string]string {
	deps := make(map[string]string)

	var doc map[string]interface{}
	if err := toml.Unmarshal(data, &doc); err != nil {
		return deps
	}

	project, ok := doc["project"].(map[string]interface{})
	if !ok {
		return deps
	}

	dependencies, ok := project["dependencies"].([]interface{})
	if !ok {
		return deps
	}

	for _, dep := range dependencies {
		if depStr, ok := dep.(string); ok {
			name, version := cleanVersionPip(depStr)
			if name != "" {
				deps[name] = version
			}
		}
	}

	return deps
}

type pypiRegistryResponse struct {
	Info struct {
		Name        string `json:"name"`
		Version     string `json:"version"`
		License     string `json:"license"`
		HomePage    string `json:"home_page"`
		ProjectUrls map[string]string `json:"project_urls"`
	} `json:"info"`
}

func ResolveVersionPip(ctx context.Context, rdb *redis.Client, pkgName, version string) (Package, error) {
	cacheKey := fmt.Sprintf("pip:%s:%s", pkgName, version)

	if rdb != nil {
		if cachedStr, err := rdb.Get(ctx, cacheKey).Result(); err == nil && cachedStr != "" {
			var pkg Package
			if err := json.Unmarshal([]byte(cachedStr), &pkg); err == nil {
				return pkg, nil
			}
		}
	}

	apiURL := fmt.Sprintf("https://pypi.org/pypi/%s/json", pkgName)
	if version != "" {
		apiURL = fmt.Sprintf("https://pypi.org/pypi/%s/%s/json", pkgName, version)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return Package{}, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return Package{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		if version != "" {
			return ResolveVersionPip(ctx, rdb, pkgName, "")
		}
		fmt.Printf("Warning: PyPI package not found %s\n", pkgName)
		return Package{}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return Package{}, fmt.Errorf("pypi returned status %d for %s", resp.StatusCode, pkgName)
	}

	var data pypiRegistryResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return Package{}, err
	}

	homepage := data.Info.HomePage
	if homepage == "" && data.Info.ProjectUrls != nil {
		if hp, ok := data.Info.ProjectUrls["Homepage"]; ok {
			homepage = hp
		}
	}

	license := data.Info.License
	if len(license) > 100 {
		license = "Custom"
	}
	if license == "" {
		license = "Unknown"
	}

	pkg := Package{
		Name:        data.Info.Name,
		Version:     data.Info.Version,
		VersionSpec: version,
		License:     license,
		Homepage:    homepage,
		Ecosystem:   "pip",
		Depth:       0,
	}

	if rdb != nil {
		if bytes, err := json.Marshal(pkg); err == nil {
			rdb.Set(ctx, cacheKey, string(bytes), 24*time.Hour)
		}
	}

	return pkg, nil
}

func ScanPip(ctx context.Context, rdb *redis.Client, fileBytes []byte, fileType string) ([]Package, error) {
	var deps map[string]string
	if fileType == "requirements.txt" {
		deps = ParseRequirementsTxt(fileBytes)
	} else if fileType == "pyproject.toml" {
		deps = ParsePyprojectToml(fileBytes)
	} else {
		return nil, fmt.Errorf("unsupported pip file format: %s", fileType)
	}

	var results []Package
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10)

	for name, version := range deps {
		name := name
		version := version

		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if ctx.Err() != nil {
				return
			}

			pkg, err := ResolveVersionPip(ctx, rdb, name, version)
			if err != nil {
				fmt.Printf("Failed to resolve pip %s@%s: %v\n", name, version, err)
				return
			}

			if pkg.Name != "" {
				mu.Lock()
				results = append(results, pkg)
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	return results, nil
}
