package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/deptic-io/api/internal/compliance"
	"github.com/deptic-io/api/internal/db"
	"github.com/deptic-io/api/internal/report"
	"github.com/deptic-io/api/internal/scanner"
	"github.com/deptic-io/api/internal/vuln"
)

// DownloadPDFReport handles GET /api/scans/:scanID/report/pdf
//
// It fetches the scan record, components, vulnerability summary, and stored
// NTIA compliance detail from the database, calls GeneratePDFReport, and
// streams the resulting PDF back to the client.
func (h *ScanHandler) DownloadPDFReport(c *fiber.Ctx) error {
	scanID := c.Params("scanID")
	userID := c.Locals("user_id").(string)

	// ── 1. Ownership check ────────────────────────────────────────────────────
	var exists bool
	err := h.db.QueryRowContext(c.Context(), `
		SELECT EXISTS (
			SELECT 1 FROM scans sc
			JOIN projects p ON sc.project_id = p.id
			WHERE sc.id = $1 AND p.user_id = $2
		)`, scanID, userID).Scan(&exists)
	if err != nil || !exists {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	// ── 2. Fetch scan + extra metadata ────────────────────────────────────────
	var (
		scanRow      db.Scan
		repoURL      sql.NullString
		ecosystem    sql.NullString
		compDetailBytes []byte
		euCompliant  bool
	)

	err = h.db.QueryRowContext(c.Context(), `
		SELECT s.id, s.project_id, s.status, s.created_at,
		       s.repo_url, s.ecosystem, s.compliance_detail, s.eu_cra_compliant
		FROM scans s
		WHERE s.id = $1`, scanID).
		Scan(
			&scanRow.ID, &scanRow.ProjectID, &scanRow.Status, &scanRow.CreatedAt,
			&repoURL, &ecosystem, &compDetailBytes, &euCompliant,
		)
	if err != nil {
		// Fall back to minimal scan fetch if extended columns don't exist yet
		err2 := h.db.QueryRowContext(c.Context(),
			`SELECT id, project_id, status, created_at FROM scans WHERE id = $1`, scanID).
			Scan(&scanRow.ID, &scanRow.ProjectID, &scanRow.Status, &scanRow.CreatedAt)
		if err2 != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Scan not found"})
		}
	}

	// ── 3. Fetch components ───────────────────────────────────────────────────
	_, dbComponents, err := db.GetScanWithComponents(c.Context(), h.db, scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch components"})
	}

	// Convert db.Component → scanner.Package (gofpdf layer expects scanner.Package)
	var pkgs []scanner.Package
	for _, comp := range dbComponents {
		pkgs = append(pkgs, scanner.Package{
			Name:      comp.Name,
			Version:   comp.Version,
			License:   comp.License,
			Ecosystem: comp.Ecosystem,
			Depth:     comp.Depth,
		})
	}

	// ── 4. Fetch vulnerability summary + details ───────────────────────────────
	critical, high, medium, low, _ := vuln.GetScanVulnSummary(c.Context(), h.db, scanID)
	vulnSummary := report.VulnSummary{
		Critical: critical,
		High:     high,
		Medium:   medium,
		Low:      low,
	}

	// Top 20 vulnerability details
	vulnRows, err := h.db.QueryContext(c.Context(), `
		SELECT c.name, c.version, cv.cve_id, cv.severity, cv.summary
		FROM component_vulnerabilities cv
		JOIN components c ON c.id = cv.component_id
		WHERE c.scan_id = $1
		ORDER BY
			CASE cv.severity
				WHEN 'CRITICAL' THEN 1
				WHEN 'HIGH' THEN 2
				WHEN 'MEDIUM' THEN 3
				WHEN 'LOW' THEN 4
				ELSE 5
			END ASC
		LIMIT 20`, scanID)

	var vulnDetails []report.VulnDetail
	if err == nil {
		defer vulnRows.Close()
		for vulnRows.Next() {
			var vd report.VulnDetail
			if scanErr := vulnRows.Scan(&vd.PackageName, &vd.PackageVersion, &vd.CVEID, &vd.Severity, &vd.Summary); scanErr == nil {
				vulnDetails = append(vulnDetails, vd)
			}
		}
	}

	// ── 5. Unmarshal NTIA compliance detail ───────────────────────────────────
	var ntiaResult compliance.NTIAResult
	if len(compDetailBytes) > 0 {
		_ = json.Unmarshal(compDetailBytes, &ntiaResult)
	}

	fmt.Printf("PDF Gen - Fetched repo_url: %s, ecosystem: %s\n", repoURL.String, ecosystem.String)

	// ── 6. Build ScanInfo ─────────────────────────────────────────────────────
	repoName := repoURL.String
	fullRepoName := "Unknown Repository"
	shortName := "unknown"
	
	if repoName != "" {
		parts := strings.Split(strings.TrimRight(repoName, "/"), "/")
		shortName = parts[len(parts)-1]
		if shortName == "" {
			shortName = repoName
		}
		fullRepoName = shortName
		if len(parts) >= 2 {
			fullRepoName = fmt.Sprintf("%s/%s", parts[len(parts)-2], shortName)
		}
	}

	ecoStr := ecosystem.String
	if ecoStr == "" {
		ecoStr = "unknown"
	}

	fmt.Printf("NTIA elements loaded: %d, score: %d\n", len(ntiaResult.Elements), ntiaResult.Score)
	if len(ntiaResult.Elements) == 0 {
		depticMeta := compliance.DEPTICMeta{
			AuthorName:  "DEPTIC.io",
			AuthorTool:  "deptic-io-scanner v1.0.0",
			GeneratedAt: scanRow.CreatedAt,
			RepoName:    fullRepoName,
		}
		ntiaResult = compliance.CheckNTIA(pkgs, depticMeta)
	}

	scanInfo := report.ScanInfo{
		ID:          scanRow.ID,
		RepoName:    fullRepoName,
		RepoURL:     repoName,
		Ecosystem:   ecoStr,
		GeneratedAt: scanRow.CreatedAt.Format("2006-01-02 15:04:05 UTC"),
	}

	// ── 7. Generate PDF ───────────────────────────────────────────────────────
	pdfBytes, err := report.GeneratePDFReport(scanInfo, pkgs, vulnSummary, vulnDetails, ntiaResult, euCompliant)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate PDF: " + err.Error()})
	}

	// ── 8. Send response ──────────────────────────────────────────────────────
	safeShortName := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, shortName)

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="deptic-report-%s.pdf"`, safeShortName))
	return c.Send(pdfBytes)
}
