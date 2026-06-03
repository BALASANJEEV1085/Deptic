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
var nameRegex = regexp.MustCompile(`^[A-Za-z0-9\-\_\.]+`)

func cleanVersionPip(dep string) (string, string) {
	if idx := strings.Index(dep, ";"); idx != -1 {
		dep = dep[:idx]
	}
	dep = strings.TrimSpace(dep)

	nameMatch := nameRegex.FindString(dep)
	if nameMatch == "" {
		return "", ""
	}
	name := nameMatch

	version := ""
	matches := versionOperatorRegex.FindStringSubmatch(dep)
	if len(matches) > 2 {
		version = strings.TrimSpace(matches[2])
		if idx := strings.Index(version, ","); idx != -1 {
			version = version[:idx]
		}
		if idx := strings.Index(version, ")"); idx != -1 {
			version = version[:idx]
		}
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
		Name         string   `json:"name"`
		Version      string   `json:"version"`
		License      string   `json:"license"`
		HomePage     string   `json:"home_page"`
		ProjectUrls  map[string]string `json:"project_urls"`
		RequiresDist []string `json:"requires_dist"`
	} `json:"info"`
}

type pipResolveResult struct {
	Pkg Package
	Req []string
}

func ResolveVersionPip(ctx context.Context, rdb *redis.Client, pkgName, version string) (Package, []string, error) {
	cacheKey := fmt.Sprintf("pip-v2:%s:%s", pkgName, version)

	if rdb != nil {
		if cachedStr, err := rdb.Get(ctx, cacheKey).Result(); err == nil && cachedStr != "" {
			var res pipResolveResult
			if err := json.Unmarshal([]byte(cachedStr), &res); err == nil {
				return res.Pkg, res.Req, nil
			}
		}
	}

	apiURL := fmt.Sprintf("https://pypi.org/pypi/%s/json", pkgName)
	if version != "" {
		apiURL = fmt.Sprintf("https://pypi.org/pypi/%s/%s/json", pkgName, version)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return Package{}, nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return Package{}, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		if version != "" {
			return ResolveVersionPip(ctx, rdb, pkgName, "")
		}
		fmt.Printf("Warning: PyPI package not found %s\n", pkgName)
		return Package{}, nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		return Package{}, nil, fmt.Errorf("pypi returned status %d for %s", resp.StatusCode, pkgName)
	}

	var data pypiRegistryResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return Package{}, nil, err
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

	reqDist := data.Info.RequiresDist
	res := pipResolveResult{Pkg: pkg, Req: reqDist}

	if rdb != nil {
		if bytes, err := json.Marshal(res); err == nil {
			rdb.Set(ctx, cacheKey, string(bytes), 24*time.Hour)
		}
	}

	return pkg, reqDist, nil
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
	sem := make(chan struct{}, 5)
	
	visited := &sync.Map{}

	var resolveRecursive func(name, version string, depth int, parent string)
	resolveRecursive = func(name, version string, depth int, parent string) {
		if depth > 3 {
			return
		}

		lowerName := strings.ToLower(name)
		normalizedName := strings.ReplaceAll(lowerName, "_", "-")
		normalizedName = strings.ReplaceAll(normalizedName, ".", "-")
		
		if _, loaded := visited.LoadOrStore(normalizedName, true); loaded {
			return
		}

		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if ctx.Err() != nil {
				return
			}

			pkg, reqDist, err := ResolveVersionPip(ctx, rdb, name, version)
			if err != nil {
				fmt.Printf("Failed to resolve pip %s@%s: %v\n", name, version, err)
				return
			}

			if pkg.Name != "" {
				pkg.Depth = depth
				pkg.ParentName = parent
				
				mu.Lock()
				results = append(results, pkg)
				mu.Unlock()

				for _, r := range reqDist {
					depName, depVer := cleanVersionPip(r)
					if depName != "" {
						resolveRecursive(depName, depVer, depth+1, pkg.Name)
					}
				}
			}
		}()
	}

	for name, version := range deps {
		resolveRecursive(name, version, 0, "")
	}

	wg.Wait()

	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	return results, nil
}
