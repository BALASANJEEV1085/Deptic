package deptic

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/deptic-io/api/internal/scanner"
	"github.com/deptic-io/api/internal/vuln"
)

type ScanInfo struct {
	ID        string
	RepoName  string
	RepoURL   string
	Ecosystem string
}

type CycloneDXBOM struct {
	BOMFormat       string         `json:"bomFormat"`
	SpecVersion     string         `json:"specVersion"`
	SerialNumber    string         `json:"serialNumber"`
	Version         int            `json:"version"`
	Metadata        BOMMetadata    `json:"metadata"`
	Components      []BOMComponent `json:"components"`
	Dependencies    []Dependency   `json:"dependencies"`
	Vulnerabilities []BOMVuln      `json:"vulnerabilities,omitempty"`
}

type BOMMetadata struct {
	Timestamp string        `json:"timestamp"`
	Tools     []BOMTool     `json:"tools"`
	Component *BOMComponent `json:"component,omitempty"`
}

type BOMTool struct {
	Vendor  string `json:"vendor"`
	Name    string `json:"name"`
	Version string `json:"version"`
}

type BOMComponent struct {
	Type         string                `json:"type"`
	BOMREF       string                `json:"bom-ref"`
	Name         string                `json:"name"`
	Version      string                `json:"version"`
	PURL         string                `json:"purl"`
	Licenses     []BOMComponentLicense `json:"licenses,omitempty"`
	ExternalRefs []BOMExternalRef      `json:"externalReferences,omitempty"`
}

type BOMComponentLicense struct {
	License BOMLicense `json:"license"`
}

type BOMLicense struct {
	ID string `json:"id"`
}

type BOMExternalRef struct {
	Type string `json:"type"`
	URL  string `json:"url"`
}

type Dependency struct {
	Ref       string   `json:"ref"`
	DependsOn []string `json:"dependsOn"`
}

type BOMVuln struct {
	ID          string          `json:"id"`
	Source      BOMVulnSource   `json:"source"`
	Ratings     []BOMVulnRating `json:"ratings,omitempty"`
	Description string          `json:"description,omitempty"`
}

type BOMVulnSource struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type BOMVulnRating struct {
	Score    float64 `json:"score,omitempty"`
	Severity string  `json:"severity"`
	Method   string  `json:"method"`
}

func mapLicense(lic string) string {
	l := strings.ToLower(lic)
	if strings.Contains(l, "mit") {
		return "MIT"
	}
	if strings.Contains(l, "apache") && strings.Contains(l, "2") {
		return "Apache-2.0"
	}
	if strings.Contains(l, "isc") {
		return "ISC"
	}
	if strings.Contains(l, "bsd") && strings.Contains(l, "3") {
		return "BSD-3-Clause"
	}
	if strings.Contains(l, "bsd") && strings.Contains(l, "2") {
		return "BSD-2-Clause"
	}
	if strings.Contains(l, "gpl") && strings.Contains(l, "3") {
		return "GPL-3.0-only"
	}
	if strings.Contains(l, "gpl") && strings.Contains(l, "2") {
		return "GPL-2.0-only"
	}
	return ""
}

func GenerateCycloneDX(
	scan ScanInfo,
	components []scanner.Package,
	vulns []vuln.ComponentVuln,
) ([]byte, string, error) {

	bom := CycloneDXBOM{
		BOMFormat:    "CycloneDX",
		SpecVersion:  "1.5",
		SerialNumber: "urn:uuid:" + scan.ID,
		Version:      1,
		Metadata: BOMMetadata{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Tools: []BOMTool{
				{
					Vendor:  "DEPTIC.io",
					Name:    "deptic-io-scanner",
					Version: "1.0.0",
				},
			},
			Component: &BOMComponent{
				Type:    "application",
				BOMREF:  "root",
				Name:    scan.RepoName,
				Version: "latest",
			},
		},
		Components:      []BOMComponent{},
		Dependencies:    []Dependency{},
		Vulnerabilities: []BOMVuln{},
	}

	depMap := make(map[string][]string)
	rootDeps := []string{}

	for _, pkg := range components {
		bomRef := fmt.Sprintf("%s@%s", pkg.Name, pkg.Version)

		purl := ""
		if pkg.Ecosystem == "npm" {
			purl = fmt.Sprintf("pkg:npm/%s@%s", pkg.Name, pkg.Version)
		} else if pkg.Ecosystem == "pip" {
			purl = fmt.Sprintf("pkg:pypi/%s@%s", pkg.Name, pkg.Version)
		} else if pkg.Ecosystem == "maven" {
			// Maven Name format is "groupID:artifactID"
			mavenParts := strings.SplitN(pkg.Name, ":", 2)
			if len(mavenParts) == 2 {
				purl = fmt.Sprintf("pkg:maven/%s/%s@%s", mavenParts[0], mavenParts[1], pkg.Version)
			} else {
				purl = fmt.Sprintf("pkg:maven/%s@%s", pkg.Name, pkg.Version)
			}
		} else if pkg.Ecosystem == "go" {
			purl = fmt.Sprintf("pkg:golang/%s@%s", pkg.Name, pkg.Version)
		} else {
			purl = fmt.Sprintf("pkg:generic/%s@%s", pkg.Name, pkg.Version)
		}

		comp := BOMComponent{
			Type:    "library",
			BOMREF:  bomRef,
			Name:    pkg.Name,
			Version: pkg.Version,
			PURL:    purl,
		}

		mappedLic := mapLicense(pkg.License)
		if mappedLic != "" {
			comp.Licenses = []BOMComponentLicense{
				{
					License: BOMLicense{ID: mappedLic},
				},
			}
		}

		if pkg.Homepage != "" {
			comp.ExternalRefs = []BOMExternalRef{
				{
					Type: "website",
					URL:  pkg.Homepage,
				},
			}
		}

		bom.Components = append(bom.Components, comp)

		if pkg.Depth == 0 {
			rootDeps = append(rootDeps, bomRef)
		}
	}

	nameToRef := make(map[string]string)
	for _, pkg := range components {
		nameToRef[pkg.Name] = fmt.Sprintf("%s@%s", pkg.Name, pkg.Version)
	}

	for _, pkg := range components {
		bomRef := fmt.Sprintf("%s@%s", pkg.Name, pkg.Version)
		if pkg.Depth > 0 && pkg.ParentName != "" {
			parentRef, ok := nameToRef[pkg.ParentName]
			if !ok {
				parentRef = fmt.Sprintf("%s@unknown", pkg.ParentName)
			}
			depMap[parentRef] = append(depMap[parentRef], bomRef)
		}
	}

	bom.Dependencies = append(bom.Dependencies, Dependency{
		Ref:       "root",
		DependsOn: rootDeps,
	})

	for parentRef, children := range depMap {
		bom.Dependencies = append(bom.Dependencies, Dependency{
			Ref:       parentRef,
			DependsOn: children,
		})
	}

	if len(vulns) > 0 {
		for _, v := range vulns {
			bomVuln := BOMVuln{
				ID: v.CVEID,
				Source: BOMVulnSource{
					Name: "NVD",
					URL:  fmt.Sprintf("https://nvd.nist.gov/vuln/detail/%s", v.CVEID),
				},
				Description: v.Summary,
				Ratings: []BOMVulnRating{
					{
						Severity: strings.ToLower(v.Severity),
						Method:   "CVSSv31",
					},
				},
			}
			bom.Vulnerabilities = append(bom.Vulnerabilities, bomVuln)
		}
	} else {
		bom.Vulnerabilities = nil
	}

	jsonBytes, err := json.MarshalIndent(bom, "", "  ")
	if err != nil {
		return nil, "", err
	}

	hash := sha256.Sum256(jsonBytes)
	hashStr := hex.EncodeToString(hash[:])

	return jsonBytes, hashStr, nil
}
