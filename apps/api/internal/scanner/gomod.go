package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type GoModDep struct {
	Path     string
	Version  string
	Indirect bool
}

// ParseGoMod parses go.mod line by line
func ParseGoMod(data []byte) (moduleName string, deps []GoModDep, err error) {
	lines := strings.Split(string(data), "\n")
	inRequireBlock := false

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "module ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				moduleName = parts[1]
			}
			continue
		}

		if strings.HasPrefix(line, "go ") || strings.HasPrefix(line, "replace ") || strings.HasPrefix(line, "exclude ") || strings.HasPrefix(line, "retract ") {
			continue
		}

		if strings.HasPrefix(line, "//") {
			continue
		}

		if strings.Contains(line, "=>") {
			continue
		}

		if line == "require (" {
			inRequireBlock = true
			continue
		}

		if inRequireBlock && line == ")" {
			inRequireBlock = false
			continue
		}

		if strings.HasPrefix(line, "require ") {
			line = strings.TrimPrefix(line, "require ")
			line = strings.TrimSpace(line)
			dep := parseGoModDepLine(line)
			if dep != nil {
				deps = append(deps, *dep)
			}
			continue
		}

		if inRequireBlock {
			dep := parseGoModDepLine(line)
			if dep != nil {
				deps = append(deps, *dep)
			}
		}
	}

	return moduleName, deps, nil
}

func parseGoModDepLine(line string) *GoModDep {
	parts := strings.Fields(line)
	if len(parts) < 2 {
		return nil
	}

	path := parts[0]
	version := parts[1]
	indirect := strings.HasSuffix(line, "// indirect")

	return &GoModDep{
		Path:     path,
		Version:  version,
		Indirect: indirect,
	}
}

// EscapePath replaces every uppercase letter with !+lowercase
func EscapePath(path string) string {
	var escaped strings.Builder
	for _, r := range path {
		if r >= 'A' && r <= 'Z' {
			escaped.WriteByte('!')
			escaped.WriteRune(r + ('a' - 'A'))
		} else {
			escaped.WriteRune(r)
		}
	}
	return escaped.String()
}

// ResolveGoModule fetches actual version, mod file, and pkg.go.dev metadata
func ResolveGoModule(ctx context.Context, rdb *redis.Client, path, version string) (Package, error) {
	escapedPath := EscapePath(path)

	// Step 1: Resolve exact version
	exactVersion := version
	infoURL := fmt.Sprintf("https://proxy.golang.org/%s/@v/%s.info", escapedPath, EscapePath(version))

	reqInfo, err := http.NewRequestWithContext(ctx, "GET", infoURL, nil)
	if err == nil {
		respInfo, err := http.DefaultClient.Do(reqInfo)
		if err == nil && respInfo.StatusCode == http.StatusOK {
			var info struct {
				Version string `json:"Version"`
			}
			if err := json.NewDecoder(respInfo.Body).Decode(&info); err == nil {
				exactVersion = info.Version
			}
			respInfo.Body.Close()
		} else if respInfo != nil {
			respInfo.Body.Close()
		}
	}

	// Step 3: Fetch pkg.go.dev info for license and homepage
	license := "Unknown"
	homepage := fmt.Sprintf("https://pkg.go.dev/%s", path)

	cacheKey := fmt.Sprintf("go:%s:%s", path, exactVersion)
	if rdb != nil {
		if cachedStr, err := rdb.Get(ctx, cacheKey).Result(); err == nil && cachedStr != "" {
			var cachedPkg Package
			if err := json.Unmarshal([]byte(cachedStr), &cachedPkg); err == nil {
				return cachedPkg, nil
			}
		}
	}

	depsDevURL := fmt.Sprintf("https://api.deps.dev/v3alpha/systems/go/packages/%s/versions/%s", url.PathEscape(path), url.PathEscape(exactVersion))
	reqDeps, err := http.NewRequestWithContext(ctx, "GET", depsDevURL, nil)
	if err == nil {
		respDeps, err := http.DefaultClient.Do(reqDeps)
		if err == nil && respDeps.StatusCode == http.StatusOK {
			var depsInfo struct {
				Licenses []string `json:"licenses"`
				Links    []struct {
					Label string `json:"label"`
					URL   string `json:"url"`
				} `json:"links"`
			}
			if err := json.NewDecoder(respDeps.Body).Decode(&depsInfo); err == nil {
				if len(depsInfo.Licenses) > 0 {
					license = depsInfo.Licenses[0]
				}
				for _, link := range depsInfo.Links {
					if link.Label == "HOMEPAGE" {
						homepage = link.URL
						break
					}
				}
			}
			respDeps.Body.Close()
		} else if respDeps != nil {
			respDeps.Body.Close()
		}
	}

	pkg := Package{
		Name:      path,
		Version:   exactVersion,
		License:   license,
		Homepage:  homepage,
		Ecosystem: "go",
		Depth:     0,
	}

	if rdb != nil {
		if bytes, err := json.Marshal(pkg); err == nil {
			rdb.Set(ctx, cacheKey, string(bytes), 24*time.Hour)
		}
	}

	return pkg, nil
}

// ScanGoMod orchestrates the parsing and resolution
func ScanGoMod(ctx context.Context, rdb *redis.Client, goModBytes []byte) ([]Package, error) {
	_, deps, err := ParseGoMod(goModBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse go.mod: %w", err)
	}

	var results []Package
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5) // Max 5 concurrent requests
	seen := make(map[string]bool)

	for _, dep := range deps {
		if seen[dep.Path] {
			continue
		}
		seen[dep.Path] = true

		dep := dep // copy for goroutine
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			pkg, err := ResolveGoModule(ctx, rdb, dep.Path, dep.Version)
			if err != nil {
				log.Printf("Warning: failed to resolve Go module %s@%s: %v", dep.Path, dep.Version, err)
				return // Many internal/test packages 404, we skip them
			}

			if dep.Indirect {
				pkg.Depth = 1
			} else {
				pkg.Depth = 0
			}

			mu.Lock()
			results = append(results, pkg)
			mu.Unlock()
		}()
	}

	wg.Wait()
	return results, nil
}
