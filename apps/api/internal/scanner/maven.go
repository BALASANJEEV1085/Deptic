package scanner

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// ─── POM XML types ────────────────────────────────────────────────────────────

type MavenDep struct {
	GroupID    string
	ArtifactID string
	Version    string
	Scope      string
	Optional   bool
}

type ParentPOM struct {
	GroupID    string `xml:"groupId"`
	ArtifactID string `xml:"artifactId"`
	Version    string `xml:"version"`
}

type pomXML struct {
	XMLName    xml.Name                `xml:"project"`
	GroupID    string                  `xml:"groupId"`
	ArtifactID string                  `xml:"artifactId"`
	Version    string                  `xml:"version"`
	Parent     ParentPOM               `xml:"parent"`
	Properties pomProps                `xml:"properties"`
	Deps       []pomDep                `xml:"dependencies>dependency"`
	DepMgmt    pomDependencyManagement `xml:"dependencyManagement"`
}

type pomDependencyManagement struct {
	Deps []pomDep `xml:"dependencies>dependency"`
}

type pomProps struct {
	Entries map[string]string
}

func (p *pomProps) UnmarshalXML(d *xml.Decoder, start xml.StartElement) error {
	p.Entries = make(map[string]string)
	for {
		tok, err := d.Token()
		if err != nil {
			return err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			var val string
			if err := d.DecodeElement(&val, &t); err != nil {
				return err
			}
			p.Entries[t.Name.Local] = val
		case xml.EndElement:
			return nil
		}
	}
}

type pomDep struct {
	GroupID    string `xml:"groupId"`
	ArtifactID string `xml:"artifactId"`
	Version    string `xml:"version"`
	Scope      string `xml:"scope"`
	Optional   string `xml:"optional"`
}

type pomMeta struct {
	XMLName  xml.Name     `xml:"project"`
	Name     string       `xml:"name"`
	URL      string       `xml:"url"`
	Licenses []pomLicense `xml:"licenses>license"`
}

type pomLicense struct {
	Name string `xml:"name"`
	URL  string `xml:"url"`
}

// ─── ParsePOMXML ─────────────────────────────────────────────────────────────

func ParsePOMXML(data []byte, skipTest bool) (groupID, artifactID, version string, parent ParentPOM, props map[string]string, deps []MavenDep, err error) {
	var pom pomXML
	if err = xml.Unmarshal(data, &pom); err != nil {
		return "", "", "", ParentPOM{}, nil, nil, fmt.Errorf("parsing pom.xml: %w", err)
	}

	groupID = pom.GroupID
	if groupID == "" {
		groupID = pom.Parent.GroupID
	}
	artifactID = pom.ArtifactID
	version = pom.Version
	if version == "" {
		version = pom.Parent.Version
	}

	props = pom.Properties.Entries
	if props == nil {
		props = make(map[string]string)
	}

	for _, d := range pom.Deps {
		scope := strings.ToLower(strings.TrimSpace(d.Scope))
		if scope == "" {
			scope = "compile"
		}
		if skipTest && (scope == "test" || scope == "provided" || strings.ToLower(strings.TrimSpace(d.Optional)) == "true") {
			continue
		}
		deps = append(deps, MavenDep{
			GroupID:    strings.TrimSpace(d.GroupID),
			ArtifactID: strings.TrimSpace(d.ArtifactID),
			Version:    strings.TrimSpace(d.Version),
			Scope:      scope,
			Optional:   strings.ToLower(strings.TrimSpace(d.Optional)) == "true",
		})
	}
	return groupID, artifactID, version, pom.Parent, props, deps, nil
}

// ─── FetchAndParseParentPOM ──────────────────────────────────────────────────

func FetchAndParseParentPOM(ctx context.Context, rdb *redis.Client, parent ParentPOM) (map[string]string, map[string]string, error) {
	cacheKey := fmt.Sprintf("maven-parent:%s:%s:%s", parent.GroupID, parent.ArtifactID, parent.Version)

	if rdb != nil {
		if cached, err := rdb.Get(ctx, cacheKey).Result(); err == nil && cached != "" {
			var result struct {
				Deps  map[string]string
				Props map[string]string
			}
			if err := json.Unmarshal([]byte(cached), &result); err == nil {
				return result.Deps, result.Props, nil
			}
		}
	}

	depMgmt := make(map[string]string)
	props := make(map[string]string)
	
	currentParent := parent
	for depth := 0; depth < 5; depth++ {
		groupPath := strings.ReplaceAll(currentParent.GroupID, ".", "/")
		pomURL := fmt.Sprintf(
			"https://repo1.maven.org/maven2/%s/%s/%s/%s-%s.pom",
			groupPath, currentParent.ArtifactID, currentParent.Version, currentParent.ArtifactID, currentParent.Version,
		)

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, pomURL, nil)
		if err != nil {
			break
		}
		req.Header.Set("User-Agent", "deptic-io-scanner/1.0")

		client := &http.Client{Timeout: 12 * time.Second}
		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			break
		}

		var pom pomXML
		if err := xml.NewDecoder(resp.Body).Decode(&pom); err != nil {
			resp.Body.Close()
			break
		}
		resp.Body.Close()

		for _, d := range pom.DepMgmt.Deps {
			key := strings.TrimSpace(d.GroupID) + ":" + strings.TrimSpace(d.ArtifactID)
			if _, exists := depMgmt[key]; !exists {
				depMgmt[key] = strings.TrimSpace(d.Version)
			}
		}

		if pom.Properties.Entries != nil {
			for k, v := range pom.Properties.Entries {
				if _, exists := props[k]; !exists {
					props[k] = v
				}
			}
		}

		if pom.Parent.GroupID == "" || pom.Parent.ArtifactID == "" || pom.Parent.Version == "" {
			break
		}
		currentParent = pom.Parent
	}

	if rdb != nil {
		result := struct {
			Deps  map[string]string
			Props map[string]string
		}{Deps: depMgmt, Props: props}
		if b, err := json.Marshal(result); err == nil {
			rdb.Set(ctx, cacheKey, string(b), 24*time.Hour)
		}
	}

	return depMgmt, props, nil
}

// ─── Maven Central helpers ────────────────────────────────────────────────────

type mavenSearchDoc struct {
	LatestVersion string `json:"latestVersion"`
	Version       string `json:"v"`
}

type mavenSearchResponse struct {
	Response struct {
		Docs []mavenSearchDoc `json:"docs"`
	} `json:"response"`
}

func fetchLatestVersion(ctx context.Context, groupID, artifactID string) (string, error) {
	q := url.QueryEscape(fmt.Sprintf("g:%s AND a:%s", groupID, artifactID))
	apiURL := fmt.Sprintf("https://search.maven.org/solrsearch/select?q=%s&rows=1&wt=json", q)

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
		return "", fmt.Errorf("maven central search returned %d for %s:%s", resp.StatusCode, groupID, artifactID)
	}

	var res mavenSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if len(res.Response.Docs) == 0 {
		return "", fmt.Errorf("no results found for %s:%s", groupID, artifactID)
	}
	v := res.Response.Docs[0].LatestVersion
	if v == "" {
		v = res.Response.Docs[0].Version
	}
	return v, nil
}

func fetchPOMMeta(ctx context.Context, groupID, artifactID, version string) (name, homepage, license string) {
	groupPath := strings.ReplaceAll(groupID, ".", "/")
	pomURL := fmt.Sprintf(
		"https://repo1.maven.org/maven2/%s/%s/%s/%s-%s.pom",
		groupPath, artifactID, version, artifactID, version,
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pomURL, nil)
	if err != nil {
		return "", "", ""
	}
	req.Header.Set("User-Agent", "deptic-io-scanner/1.0")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return "", "", ""
	}
	defer resp.Body.Close()

	var meta pomMeta
	if err := xml.NewDecoder(resp.Body).Decode(&meta); err != nil {
		return "", "", ""
	}

	name = meta.Name
	homepage = meta.URL

	var licParts []string
	for _, l := range meta.Licenses {
		if l.Name != "" {
			licParts = append(licParts, l.Name)
		}
	}
	license = strings.Join(licParts, ", ")
	if license == "" {
		license = "Unknown"
	}
	return name, homepage, license
}

// ─── ResolveVersionMaven ──────────────────────────────────────────────────────

func ResolveVersionMaven(ctx context.Context, rdb *redis.Client, groupID, artifactID, version string) (Package, error) {
	cacheKey := fmt.Sprintf("maven:%s:%s:%s", groupID, artifactID, version)

	if rdb != nil && version != "" {
		if cached, err := rdb.Get(ctx, cacheKey).Result(); err == nil && cached != "" {
			var pkg Package
			if err := json.Unmarshal([]byte(cached), &pkg); err == nil {
				return pkg, nil
			}
		}
	}

	resolvedVersion := version
	if resolvedVersion == "" {
		latest, err := fetchLatestVersion(ctx, groupID, artifactID)
		if err != nil {
			return Package{}, fmt.Errorf("resolving latest version for %s:%s: %w", groupID, artifactID, err)
		}
		resolvedVersion = latest
	}

	_, homepage, license := fetchPOMMeta(ctx, groupID, artifactID, resolvedVersion)

	pkg := Package{
		Name:        groupID + ":" + artifactID,
		Version:     resolvedVersion,
		VersionSpec: version,
		License:     license,
		Homepage:    homepage,
		Ecosystem:   "maven",
		Depth:       0,
		ParentName:  "",
	}

	if rdb != nil {
		if b, err := json.Marshal(pkg); err == nil {
			cacheKeyResolved := fmt.Sprintf("maven:%s:%s:%s", groupID, artifactID, resolvedVersion)
			rdb.Set(ctx, cacheKeyResolved, string(b), 24*time.Hour)
		}
	}

	return pkg, nil
}

// ─── ScanMaven ───────────────────────────────────────────────────────────────

func ScanMaven(ctx context.Context, rdb *redis.Client, pomXMLBytes []byte) ([]Package, error) {
	_, _, version, parent, props, rawDeps, err := ParsePOMXML(pomXMLBytes, true /* skipTest */)
	if err != nil {
		return nil, fmt.Errorf("ScanMaven: %w", err)
	}

	var parentDepMgmt map[string]string
	parentProps := make(map[string]string)

	if parent.GroupID != "" && parent.ArtifactID != "" && parent.Version != "" {
		pm, pp, err := FetchAndParseParentPOM(ctx, rdb, parent)
		if err == nil {
			parentDepMgmt = pm
			parentProps = pp
		} else {
			fmt.Printf("Failed to fetch parent POM: %v\n", err)
		}
	}

	mergedProps := make(map[string]string)
	for k, v := range parentProps {
		mergedProps[k] = v
	}
	for k, v := range props {
		mergedProps[k] = v
	}
	mergedProps["project.version"] = version
	mergedProps["project.parent.version"] = parent.Version

	resolve := func(s string) string {
		if !strings.Contains(s, "${") {
			return s
		}
		for i := 0; i < 3; i++ {
			if !strings.Contains(s, "${") {
				break
			}
			for k, v := range mergedProps {
				s = strings.ReplaceAll(s, "${"+k+"}", v)
			}
		}
		return s
	}

	var deps []MavenDep
	for _, d := range rawDeps {
		d.GroupID = resolve(d.GroupID)
		d.ArtifactID = resolve(d.ArtifactID)
		d.Version = resolve(d.Version)

		if d.Version == "" && parentDepMgmt != nil {
			key := d.GroupID + ":" + d.ArtifactID
			if v, ok := parentDepMgmt[key]; ok {
				d.Version = resolve(v)
			}
		}
		deps = append(deps, d)
	}

	var results []Package
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10) // max 10 concurrent Maven Central requests

	visited := &sync.Map{}

	var resolveRecursive func(dep MavenDep, depth int, parent string, currentDepMgmt map[string]string, currentProps map[string]string)
	resolveRecursive = func(dep MavenDep, depth int, parent string, currentDepMgmt map[string]string, currentProps map[string]string) {
		if depth > 2 {
			return
		}

		depKey := dep.GroupID + ":" + dep.ArtifactID
		if _, loaded := visited.LoadOrStore(depKey, true); loaded {
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

			pkg, err := ResolveVersionMaven(ctx, rdb, dep.GroupID, dep.ArtifactID, dep.Version)
			if err != nil {
				fmt.Printf("Warning: Failed to resolve maven %s:%s@%s: %v\n", dep.GroupID, dep.ArtifactID, dep.Version, err)
				mu.Lock()
				results = append(results, Package{
					Name:      dep.GroupID + ":" + dep.ArtifactID,
					Version:   dep.Version,
					License:   "Unknown",
					Ecosystem: "maven",
					Depth:     depth,
					ParentName: parent,
				})
				mu.Unlock()
				return
			}

			pkg.Depth = depth
			pkg.ParentName = parent
			
			mu.Lock()
			results = append(results, pkg)
			mu.Unlock()

			if depth < 2 {
				// Fetch POM for transitive dependencies
				groupPath := strings.ReplaceAll(dep.GroupID, ".", "/")
				pomURL := fmt.Sprintf(
					"https://repo1.maven.org/maven2/%s/%s/%s/%s-%s.pom",
					groupPath, dep.ArtifactID, pkg.Version, dep.ArtifactID, pkg.Version,
				)

				req, err := http.NewRequestWithContext(ctx, http.MethodGet, pomURL, nil)
				if err == nil {
					req.Header.Set("User-Agent", "deptic-io-scanner/1.0")
					client := &http.Client{Timeout: 12 * time.Second}
					resp, err := client.Do(req)
					if err == nil && resp.StatusCode == http.StatusOK {
						var pom pomXML
						if xml.NewDecoder(resp.Body).Decode(&pom) == nil {
							newProps := make(map[string]string)
							if pom.Properties.Entries != nil {
								for k, v := range pom.Properties.Entries {
									newProps[k] = v
								}
							}
							newProps["project.version"] = pkg.Version
							
							newDepMgmt := make(map[string]string)
							for _, d := range pom.DepMgmt.Deps {
								k := strings.TrimSpace(d.GroupID) + ":" + strings.TrimSpace(d.ArtifactID)
								newDepMgmt[k] = strings.TrimSpace(d.Version)
							}

							resolve := func(s string) string {
								if !strings.Contains(s, "${") {
									return s
								}
								for i := 0; i < 3; i++ {
									if !strings.Contains(s, "${") {
										break
									}
									for k, v := range newProps {
										s = strings.ReplaceAll(s, "${"+k+"}", v)
									}
								}
								return s
							}

							for _, d := range pom.Deps {
								scope := strings.ToLower(strings.TrimSpace(d.Scope))
								if scope == "test" || scope == "provided" || strings.ToLower(strings.TrimSpace(d.Optional)) == "true" {
									continue
								}

								tDep := MavenDep{
									GroupID:    resolve(strings.TrimSpace(d.GroupID)),
									ArtifactID: resolve(strings.TrimSpace(d.ArtifactID)),
									Version:    resolve(strings.TrimSpace(d.Version)),
								}
								
								if tDep.Version == "" {
									if v, ok := newDepMgmt[tDep.GroupID+":"+tDep.ArtifactID]; ok {
										tDep.Version = resolve(v)
									}
								}
								
								if tDep.GroupID != "" && tDep.ArtifactID != "" {
									resolveRecursive(tDep, depth+1, pkg.Name, newDepMgmt, newProps)
								}
							}
						}
						resp.Body.Close()
					} else {
						if resp != nil {
							resp.Body.Close()
						}
						fmt.Printf("Warning: transitive POM not found for %s:%s@%s\n", dep.GroupID, dep.ArtifactID, pkg.Version)
					}
				}
			}
		}()
	}

	for _, dep := range deps {
		resolveRecursive(dep, 0, "", parentDepMgmt, mergedProps)
	}

	wg.Wait()

	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	return results, nil
}
