package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Package represents a resolved npm package dependency
type Package struct {
	Name        string
	Version     string // resolved exact version e.g. "18.2.0"
	VersionSpec string // raw from package.json e.g. "^18.2.0"
	License     string
	Homepage    string
	Ecosystem   string // always "npm"
	Depth       int    // 0=direct, 1=transitive level 1, etc
	ParentName  string // which package required this
	SourcePath  string // which manifest file this came from e.g. "frontend/package.json"
}

type packageJSON struct {
	Name            string            `json:"name"`
	Version         string            `json:"version"`
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
}

// ParsePackageJSON parses the package.json content to extract its dependencies
func ParsePackageJSON(data []byte) (name, version string, deps map[string]string, devDeps map[string]string, err error) {
	var pj packageJSON
	if err := json.Unmarshal(data, &pj); err != nil {
		return "", "", nil, nil, err
	}
	return pj.Name, pj.Version, pj.Dependencies, pj.DevDependencies, nil
}

type npmRegistryResponse struct {
	Version      string            `json:"version"`
	License      any               `json:"license"`
	Homepage     string            `json:"homepage"`
	Dependencies map[string]string `json:"dependencies"`
}

// getPackageFromRegistry fetches package info and caches it with Redis
func getPackageFromRegistry(ctx context.Context, redisClient *redis.Client, pkgName, versionSpec string, isRetry bool) (*npmRegistryResponse, error) {
	cacheKey := fmt.Sprintf("npm:%s:%s", pkgName, versionSpec)

	if redisClient != nil {
		if cachedStr, err := redisClient.Get(ctx, cacheKey).Result(); err == nil && cachedStr != "" {
			var data npmRegistryResponse
			if err := json.Unmarshal([]byte(cachedStr), &data); err == nil {
				return &data, nil
			}
		}
	}

	escapedName := strings.ReplaceAll(url.QueryEscape(pkgName), "%40", "@")
	escapedSpec := url.QueryEscape(versionSpec)
	apiURL := fmt.Sprintf("https://registry.npmjs.org/%s/%s", escapedName, escapedSpec)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		if !isRetry {
			time.Sleep(2 * time.Second)
			return getPackageFromRegistry(ctx, redisClient, pkgName, versionSpec, true)
		}
		return nil, fmt.Errorf("npm registry rate limit (429) hit twice for %s@%s", pkgName, versionSpec)
	}

	if resp.StatusCode != http.StatusOK {
		if (resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusMethodNotAllowed) && versionSpec != "latest" {
			return getPackageFromRegistry(ctx, redisClient, pkgName, "latest", isRetry)
		}
		err = fmt.Errorf("npm registry returned status %d for %s@%s (URL: %s)", resp.StatusCode, pkgName, versionSpec, apiURL)
		return nil, err
	}

	var data npmRegistryResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		fmt.Printf("Error decoding JSON for %s: %v\n", pkgName, err)
		return nil, err
	}

	if redisClient != nil {
		if bytes, err := json.Marshal(data); err == nil {
			redisClient.Set(ctx, cacheKey, string(bytes), 24*time.Hour)
		}
	}

	return &data, nil
}

// extractLicense normalizes the license field which can be a string or an object in npm
func extractLicense(raw any) string {
	switch v := raw.(type) {
	case string:
		return v
	case map[string]any:
		if t, ok := v["type"].(string); ok {
			return t
		}
	}
	return "Unknown"
}

// ResolveVersion calls the npm registry and returns the exact resolved version and license
func ResolveVersion(ctx context.Context, redisClient *redis.Client, pkgName, versionSpec string) (exactVersion string, license string, err error) {
	data, err := getPackageFromRegistry(ctx, redisClient, pkgName, versionSpec, false)
	if err != nil {
		return "", "", err
	}
	return data.Version, extractLicense(data.License), nil
}

// ResolveDependencies recursively resolves a map of dependencies up to maxDepth
func ResolveDependencies(ctx context.Context, redisClient *redis.Client, deps map[string]string, maxDepth int) ([]Package, error) {
	var mu sync.Mutex
	// pkgKey -> index in results slice, so we can promote depth
	indexMap := make(map[string]int)
	var results []Package
	var wg sync.WaitGroup

	sem := make(chan struct{}, 30) // increased from 10 for faster resolution
	// visited stores pkgKey -> minimum depth seen so far
	visited := sync.Map{}

	var resolve func(depMap map[string]string, depth int, parent string)
	resolve = func(depMap map[string]string, depth int, parent string) {
		if depth > maxDepth {
			return
		}

		for name, spec := range depMap {
			name := name
			spec := spec
			depth := depth
			parent := parent

			wg.Add(1)
			go func() {
				defer wg.Done()

				sem <- struct{}{}
				defer func() { <-sem }()

				if ctx.Err() != nil {
					return
				}

				data, err := getPackageFromRegistry(ctx, redisClient, name, spec, false)
				if err != nil {
					fmt.Printf("Failed to resolve %s@%s: %v\n", name, spec, err)
					return
				}

				exactVersion := data.Version
				pkgKey := fmt.Sprintf("%s@%s", name, exactVersion)

				// Try to store our depth; if already exists check if we're shallower
				if existingDepth, loaded := visited.LoadOrStore(pkgKey, depth); loaded {
					existing := existingDepth.(int)
					if depth < existing {
						// Promote to shallower depth — update visited and results in-place
						// No need to re-recurse: sub-deps are already being resolved
						visited.Store(pkgKey, depth)
						mu.Lock()
						if idx, ok := indexMap[pkgKey]; ok {
							results[idx].Depth = depth
							results[idx].ParentName = parent
						}
						mu.Unlock()
					}
					return // sub-deps already queued via the first encounter
				}

				pkg := Package{
					Name:        name,
					Version:     exactVersion,
					VersionSpec: spec,
					License:     extractLicense(data.License),
					Homepage:    data.Homepage,
					Ecosystem:   "npm",
					Depth:       depth,
					ParentName:  parent,
				}

				mu.Lock()
				indexMap[pkgKey] = len(results)
				results = append(results, pkg)
				mu.Unlock()

				if len(data.Dependencies) > 0 && depth < maxDepth {
					resolve(data.Dependencies, depth+1, name)
				}
			}()
		}
	}

	resolve(deps, 0, "")
	wg.Wait()

	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	return results, nil
}

// ScanNPM orchestrates the parsing of package.json and resolving of direct/transitive dependencies
func ScanNPM(ctx context.Context, redisClient *redis.Client, packageJSONBytes []byte) ([]Package, error) {
	_, _, deps, devDeps, err := ParsePackageJSON(packageJSONBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse package.json: %w", err)
	}

	allDeps := make(map[string]string)
	for k, v := range deps {
		allDeps[k] = v
	}
	for k, v := range devDeps {
		allDeps[k] = v
	}

	return ResolveDependencies(ctx, redisClient, allDeps, 2) // depth 2: direct + 2 levels transitive
}
