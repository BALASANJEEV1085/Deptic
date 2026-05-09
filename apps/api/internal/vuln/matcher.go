package vuln

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type ComponentVuln struct {
	ComponentID  string
	CVEID        string
	Severity     string // CRITICAL/HIGH/MEDIUM/LOW
	Summary      string
	FixedVersion string
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
		ID       string `json:"id"`
		Summary  string `json:"summary"`
		Details  string `json:"details"`
		Aliases  []string `json:"aliases"`
		Severity []struct {
			Type  string `json:"type"`
			Score string `json:"score"`
		} `json:"severity"`
		Affected []struct {
			Ranges []struct {
				Type   string `json:"type"`
				Events []map[string]string `json:"events"`
			} `json:"ranges"`
		} `json:"affected"`
		DatabaseSpecific map[string]interface{} `json:"database_specific"`
	} `json:"vulns"`
}

func getSeverity(vuln osvResponse) string {
	// Default severity
	return "HIGH"
}

func QueryOSV(ctx context.Context, pkgName, version, ecosystem string) ([]ComponentVuln, error) {
	ecoMap := map[string]string{
		"npm":   "npm",
		"pip":   "PyPI",
		"maven": "Maven",
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

	b, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.osv.dev/v1/query", bytes.NewReader(b))
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
		return nil, fmt.Errorf("osv returned status %d", resp.StatusCode)
	}

	var res osvResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	var vulns []ComponentVuln
	for _, v := range res.Vulns {
		cveID := v.ID
		for _, alias := range v.Aliases {
			if strings.HasPrefix(alias, "CVE-") {
				cveID = alias
				break
			}
		}

		severity := "MEDIUM"
		if len(v.Severity) > 0 {
			// Real CVSS parsing would go here, we'll try a basic heuristic
			scoreStr := v.Severity[0].Score
			// Sometimes database specific has cvss score
			if cvss, ok := v.DatabaseSpecific["cvss"].(map[string]interface{}); ok {
				if scoreObj, ok2 := cvss["score"]; ok2 {
					if score, err := strconv.ParseFloat(fmt.Sprintf("%v", scoreObj), 64); err == nil {
						if score >= 9.0 {
							severity = "CRITICAL"
						} else if score >= 7.0 {
							severity = "HIGH"
						} else if score >= 4.0 {
							severity = "MEDIUM"
						} else {
							severity = "LOW"
						}
					}
				}
			} else if strings.Contains(scoreStr, "CRITICAL") {
				severity = "CRITICAL"
			} else if strings.Contains(scoreStr, "HIGH") {
				severity = "HIGH"
			}
		} else if dbSpecificSev, ok := v.DatabaseSpecific["severity"].(string); ok {
			sev := strings.ToUpper(dbSpecificSev)
			if sev == "CRITICAL" || sev == "HIGH" || sev == "MEDIUM" || sev == "LOW" {
				severity = sev
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
				fmt.Printf("Failed to query OSV for %s@%s: %v\n", comp.Name, comp.Version, err)
				return
			}

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
