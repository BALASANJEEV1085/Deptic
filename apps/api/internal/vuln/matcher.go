package vuln

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/deptic-io/api/internal/scanner"
	"golang.org/x/mod/semver"
)

type ComponentVuln struct {
	ComponentID      string
	ComponentName    string
	ComponentVersion string
	CVEID            string
	Severity         string // CRITICAL/HIGH/MEDIUM/LOW
	Summary          string
	FixedVersion     string
}

type osvRequest struct {
	Package struct {
		Name      string `json:"name"`
		Ecosystem string `json:"ecosystem"`
	} `json:"package"`
	Version string `json:"version"`
}

type osvResponse struct {
	Vulns []struct {
		ID       string   `json:"id"`
		Summary  string   `json:"summary"`
		Details  string   `json:"details"`
		Aliases  []string `json:"aliases"`
		Severity []struct {
			Type  string `json:"type"`
			Score string `json:"score"`
		} `json:"severity"`
		Affected []struct {
			Package struct {
				Name      string `json:"name"`
				Ecosystem string `json:"ecosystem"`
				PURL      string `json:"purl"`
			} `json:"package"`
			Ranges []struct {
				Type   string              `json:"type"`
				Events []map[string]string `json:"events"`
			} `json:"ranges"`
			Versions []string `json:"versions"`
		} `json:"affected"`
		DatabaseSpecific map[string]interface{} `json:"database_specific"`
	} `json:"vulns"`
}

var osvQueryURL = "https://api.osv.dev/v1/query"

func getSeverity(vuln osvResponse) string {
	for _, advisory := range vuln.Vulns {
		if severity, ok := normalizeSeverity(advisory.DatabaseSpecific["severity"]); ok {
			return severity
		}
		for _, score := range advisory.Severity {
			if severity, ok := normalizeSeverity(score.Score); ok {
				return severity
			}
		}
	}
	return "HIGH"
}

func normalizeSeverity(value interface{}) (string, bool) {
	text := strings.ToUpper(strings.TrimSpace(fmt.Sprint(value)))
	for _, severity := range []string{"CRITICAL", "HIGH", "MEDIUM", "MODERATE", "LOW"} {
		if strings.Contains(text, severity) {
			if severity == "MODERATE" {
				return "MEDIUM", true
			}
			return severity, true
		}
	}
	if score, err := strconv.ParseFloat(text, 64); err == nil {
		switch {
		case score >= 9:
			return "CRITICAL", true
		case score >= 7:
			return "HIGH", true
		case score >= 4:
			return "MEDIUM", true
		default:
			return "LOW", true
		}
	}
	return "", false
}

func versionInRange(version, rangeType string, events []map[string]string, listedVersions []string) bool {
	for _, listed := range listedVersions {
		if listed == version {
			return true
		}
	}
	if strings.EqualFold(rangeType, "GIT") || version == "" {
		return false
	}
	version = strings.TrimPrefix(version, "v")
	if !semver.IsValid("v" + version) {
		return false
	}
	introduced := "0.0.0"
	fixed := ""
	lastAffected := ""
	for _, event := range events {
		if value := strings.TrimPrefix(event["introduced"], "v"); value != "" {
			introduced = value
		}
		if value := strings.TrimPrefix(event["fixed"], "v"); value != "" {
			fixed = value
		}
		if value := strings.TrimPrefix(event["last_affected"], "v"); value != "" {
			lastAffected = value
		}
	}
	if !semver.IsValid("v"+introduced) || semver.Compare("v"+version, "v"+introduced) < 0 {
		return false
	}
	if fixed != "" && semver.IsValid("v"+fixed) && semver.Compare("v"+version, "v"+fixed) >= 0 {
		return false
	}
	if lastAffected != "" && semver.IsValid("v"+lastAffected) && semver.Compare("v"+version, "v"+lastAffected) > 0 {
		return false
	}
	return true
}

func affectedPackageMatches(pkgName, ecosystem, purl string, affectedName, affectedEco string) bool {
	if affectedName != "" && affectedName == pkgName && strings.EqualFold(affectedEco, ecosystem) {
		return true
	}
	expected := "pkg:" + strings.ToLower(ecosystem) + "/" + pkgName
	return strings.EqualFold(strings.Split(purl, "@")[0], expected)
}

func packagePURL(pkgName, ecosystem string) string {
	return "pkg:" + strings.ToLower(ecosystem) + "/" + pkgName
}

func QueryOSV(ctx context.Context, pkgName, version, ecosystem string) ([]ComponentVuln, error) {
	ecoMap := map[string]string{
		"npm":   "npm",
		"pip":   "PyPI",
		"maven": "Maven",
		"go":    "Go",
	}

	mappedEco, ok := ecoMap[ecosystem]
	if !ok {
		// fallback
		mappedEco = ecosystem
	}

	reqBody := osvRequest{
		Version: version,
	}
	reqBody.Package.Name = pkgName
	reqBody.Package.Ecosystem = mappedEco
	log.Printf("[vuln] querying OSV package=%s version=%s ecosystem=%s purl=%s", pkgName, version, ecosystem, packagePURL(pkgName, ecosystem))

	b, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", osvQueryURL, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("osv returned status %d", resp.StatusCode)
	}

	var res osvResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	log.Printf("[vuln] OSV returned %d advisories for %s@%s", len(res.Vulns), pkgName, version)

	var vulns []ComponentVuln
	for _, v := range res.Vulns {
		matched := false
		for _, affected := range v.Affected {
			if !affectedPackageMatches(pkgName, ecosystem, affected.Package.PURL, affected.Package.Name, affected.Package.Ecosystem) {
				continue
			}
			if len(affected.Ranges) == 0 && len(affected.Versions) == 0 {
				matched = true
			}
			for _, affectedRange := range affected.Ranges {
				if versionInRange(version, affectedRange.Type, affectedRange.Events, affected.Versions) {
					matched = true
				}
			}
			if matched {
				break
			}
		}
		if !matched {
			log.Printf("[vuln] %s@%s (%s) not matched by OSV advisory %s", pkgName, version, ecosystem, v.ID)
			continue
		}

		cveID := v.ID
		for _, alias := range v.Aliases {
			if strings.HasPrefix(alias, "CVE-") {
				cveID = alias
				break
			}
		}

		severity := "HIGH"
		if sev, ok := normalizeSeverity(v.DatabaseSpecific["severity"]); ok {
			severity = sev
		} else {
			for _, score := range v.Severity {
				if sev, ok := normalizeSeverity(score.Score); ok {
					severity = sev
					break
				}
			}
		}

		summary := v.Summary
		if summary == "" {
			if len(v.Details) > 200 {
				summary = v.Details[:197] + "..."
			} else {
				summary = v.Details
			}
		}

		fixedVersion := ""
		for _, aff := range v.Affected {
			for _, r := range aff.Ranges {
				for _, ev := range r.Events {
					if f, ok := ev["fixed"]; ok {
						fixedVersion = f
						break
					}
				}
			}
		}

		vulns = append(vulns, ComponentVuln{
			CVEID:        cveID,
			Severity:     severity,
			Summary:      summary,
			FixedVersion: fixedVersion,
		})
		log.Printf("[vuln] matched %s@%s (%s): advisory=%s identifier=%s severity=%s fixed=%s", pkgName, version, ecosystem, v.ID, cveID, severity, fixedVersion)
	}

	return vulns, nil
}

type Component struct {
	ID        string
	Name      string
	Version   string
	Ecosystem string
}

func MatchVulnerabilities(ctx context.Context, db *sql.DB, scanID string) ([]ComponentVuln, error) {
	rows, err := db.QueryContext(ctx, "SELECT id, name, version, ecosystem FROM components WHERE scan_id = $1", scanID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var components []Component
	for rows.Next() {
		var c Component
		if err := rows.Scan(&c.ID, &c.Name, &c.Version, &c.Ecosystem); err != nil {
			return nil, err
		}
		components = append(components, c)
	}

	var results []ComponentVuln
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 20)

	for _, comp := range components {
		comp := comp
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			vulns, err := QueryOSV(ctx, comp.Name, comp.Version, comp.Ecosystem)
			if err != nil {
				log.Printf("[vuln] query failed for %s@%s (%s): %v", comp.Name, comp.Version, comp.Ecosystem, err)
				return
			}
			log.Printf("[vuln] query result for %s@%s (%s): %d matching advisories", comp.Name, comp.Version, comp.Ecosystem, len(vulns))

			if len(vulns) > 0 {
				mu.Lock()
				for _, v := range vulns {
					v.ComponentID = comp.ID
					results = append(results, v)
				}
				mu.Unlock()
			}
		}()
	}

	wg.Wait()
	return results, nil
}

func SaveComponentVulns(ctx context.Context, db *sql.DB, vulns []ComponentVuln) error {
	if len(vulns) == 0 {
		return nil
	}

	// OSV can return multiple GHSA records that normalize to the same CVE.
	// PostgreSQL cannot update the same ON CONFLICT row twice in one INSERT.
	vulns = deduplicateComponentVulns(vulns)

	var valueStrings []string
	var valueArgs []interface{}

	for i, v := range vulns {
		baseIdx := i * 5
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d)",
			baseIdx+1, baseIdx+2, baseIdx+3, baseIdx+4, baseIdx+5))
		valueArgs = append(valueArgs, v.ComponentID, v.CVEID, v.Severity, v.Summary, v.FixedVersion)
	}

	query := fmt.Sprintf(`
		INSERT INTO component_vulnerabilities (component_id, cve_id, severity, summary, fixed_version)
		VALUES %s
		ON CONFLICT (component_id, cve_id) DO UPDATE 
		SET severity = EXCLUDED.severity, summary = EXCLUDED.summary, fixed_version = EXCLUDED.fixed_version`,
		strings.Join(valueStrings, ","))

	_, err := db.ExecContext(ctx, query, valueArgs...)
	return err
}

func severityRank(severity string) int {
	switch severity {
	case "CRITICAL":
		return 1
	case "HIGH":
		return 2
	case "MEDIUM":
		return 3
	case "LOW":
		return 4
	default:
		return 5
	}
}

func deduplicateComponentVulns(vulns []ComponentVuln) []ComponentVuln {
	unique := make(map[string]ComponentVuln, len(vulns))
	for _, vuln := range vulns {
		key := vuln.ComponentID + "\x00" + vuln.CVEID
		if existing, ok := unique[key]; !ok || severityRank(vuln.Severity) < severityRank(existing.Severity) {
			unique[key] = vuln
		}
	}
	result := make([]ComponentVuln, 0, len(unique))
	for _, vuln := range unique {
		result = append(result, vuln)
	}
	return result
}

func GetScanVulnSummary(ctx context.Context, db *sql.DB, scanID string) (critical, high, medium, low int, err error) {
	query := `
		SELECT cv.severity, COUNT(*) 
		FROM component_vulnerabilities cv
		JOIN components c ON c.id = cv.component_id
		WHERE c.scan_id = $1
		GROUP BY cv.severity
	`
	rows, err := db.QueryContext(ctx, query, scanID)
	if err != nil {
		return 0, 0, 0, 0, err
	}
	defer rows.Close()

	for rows.Next() {
		var sev string
		var count int
		if err := rows.Scan(&sev, &count); err != nil {
			return 0, 0, 0, 0, err
		}
		switch sev {
		case "CRITICAL":
			critical = count
		case "HIGH":
			high = count
		case "MEDIUM":
			medium = count
		case "LOW":
			low = count
		}
	}
	return critical, high, medium, low, nil
}

// MatchVulnerabilitiesInMemory matches vulnerabilities for in-memory packages
// without requiring DB-persisted components (used by CLI scan).
func MatchVulnerabilitiesInMemory(ctx context.Context, pkgs []scanner.Package) []ComponentVuln {
	var results []ComponentVuln
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 20)

	for _, p := range pkgs {
		p := p
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			vulns, err := QueryOSV(ctx, p.Name, p.Version, p.Ecosystem)
			if err != nil {
				log.Printf("[vuln] query failed for %s@%s (%s): %v", p.Name, p.Version, p.Ecosystem, err)
				return
			}
			log.Printf("[vuln] query result for %s@%s (%s): %d matching advisories", p.Name, p.Version, p.Ecosystem, len(vulns))
			if len(vulns) > 0 {
				mu.Lock()
				for _, v := range vulns {
					v.ComponentName = p.Name
					v.ComponentVersion = p.Version
					results = append(results, v)
				}
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	return results
}
