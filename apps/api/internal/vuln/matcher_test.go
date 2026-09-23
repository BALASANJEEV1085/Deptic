package vuln

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestQueryOSVMatchesKnownNpmVersions(t *testing.T) {
	advisories := map[string]interface{}{
		"vulns": []interface{}{
			map[string]interface{}{
				"id":      "GHSA-lodash-test",
				"aliases": []string{"CVE-2020-28500"},
				"summary": "lodash test advisory",
				"severity": []map[string]string{{
					"type":  "CVSS_V3",
					"score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
				}},
				"affected": []interface{}{map[string]interface{}{
					"package": map[string]string{"name": "lodash", "ecosystem": "npm", "purl": "pkg:npm/lodash"},
					"ranges": []interface{}{map[string]interface{}{
						"type":   "SEMVER",
						"events": []map[string]string{{"introduced": "4.0.0"}, {"fixed": "4.17.21"}},
					}},
				}},
			},
			map[string]interface{}{
				"id":                "GHSA-minimist-test",
				"aliases":           []string{"CVE-2021-44906"},
				"summary":           "minimist test advisory",
				"database_specific": map[string]string{"severity": "HIGH"},
				"affected": []interface{}{map[string]interface{}{
					"package": map[string]string{"name": "minimist", "ecosystem": "npm", "purl": "pkg:npm/minimist"},
					"ranges": []interface{}{map[string]interface{}{
						"type":   "SEMVER",
						"events": []map[string]string{{"introduced": "0"}, {"fixed": "1.2.2"}},
					}},
				}},
			},
		},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("OSV request was not JSON POST: method=%s content-type=%q", r.Method, r.Header.Get("Content-Type"))
		}
		requestBody, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read OSV request: %v", err)
		}
		var query osvRequest
		if err := json.Unmarshal(requestBody, &query); err != nil {
			t.Errorf("decode OSV request: %v", err)
		}
		if query.Package.Ecosystem != "npm" || query.Version == "" {
			t.Errorf("unexpected OSV query: %+v", query)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(advisories)
	}))
	defer server.Close()

	originalURL := osvQueryURL
	osvQueryURL = server.URL
	defer func() { osvQueryURL = originalURL }()

	for _, test := range []struct {
		name, version, wantID, wantSeverity string
	}{
		{name: "lodash", version: "4.17.15", wantID: "CVE-2020-28500", wantSeverity: "HIGH"},
		{name: "minimist", version: "1.2.0", wantID: "CVE-2021-44906", wantSeverity: "HIGH"},
	} {
		t.Run(test.name, func(t *testing.T) {
			findings, err := QueryOSV(context.Background(), test.name, test.version, "npm")
			if err != nil {
				t.Fatalf("QueryOSV returned error: %v", err)
			}
			if len(findings) != 1 {
				t.Fatalf("expected one finding, got %d", len(findings))
			}
			if findings[0].CVEID != test.wantID || findings[0].Severity != test.wantSeverity {
				t.Fatalf("unexpected finding: %+v", findings[0])
			}
		})
	}
	if packagePURL("lodash", "npm") != "pkg:npm/lodash" || packagePURL("minimist", "npm") != "pkg:npm/minimist" {
		t.Fatal("npm package PURL generation is incorrect")
	}
}

func TestVersionInRangeRejectsFixedVersion(t *testing.T) {
	events := []map[string]string{{"introduced": "4.0.0"}, {"fixed": "4.17.21"}}
	if !versionInRange("4.17.15", "SEMVER", events, nil) {
		t.Fatal("expected lodash 4.17.15 to match affected range")
	}
	if versionInRange("4.17.21", "SEMVER", events, nil) {
		t.Fatal("expected fixed version to be excluded")
	}
}

func TestDeduplicateComponentVulnsKeepsStrongestSeverity(t *testing.T) {
	findings := deduplicateComponentVulns([]ComponentVuln{
		{ComponentID: "component-1", CVEID: "CVE-1", Severity: "LOW"},
		{ComponentID: "component-1", CVEID: "CVE-1", Severity: "CRITICAL"},
		{ComponentID: "component-1", CVEID: "CVE-2", Severity: "HIGH"},
	})
	if len(findings) != 2 {
		t.Fatalf("expected two unique findings, got %d", len(findings))
	}
	for _, finding := range findings {
		if finding.CVEID == "CVE-1" && finding.Severity != "CRITICAL" {
			t.Fatalf("expected strongest severity to be retained, got %s", finding.Severity)
		}
	}
}
