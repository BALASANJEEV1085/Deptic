package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/deptic-io/api/internal/deptic"
	"github.com/deptic-io/api/internal/scanner"
	"github.com/deptic-io/api/internal/storage"
	"github.com/deptic-io/api/internal/vuln"
)

type generateDEPTICRequest struct {
	Format string `json:"format"`
}

// HandleGenerateDEPTIC handles POST /api/scans/:scanID/deptic
func (h *ScanHandler) HandleGenerateDEPTIC(c *fiber.Ctx) error {
	scanID := c.Params("scanID")
	var req generateDEPTICRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Format != "cyclonedx" && req.Format != "spdx" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format must be 'cyclonedx' or 'spdx'"})
	}

	// 1a. Fetch scan info
	var repoName, ecosystem string
	var repoURL *string
	err := h.db.QueryRowContext(c.Context(), `
		SELECT p.name, s.status, p.github_url 
		FROM scans s JOIN projects p ON s.project_id = p.id 
		WHERE s.id = $1`, scanID).Scan(&repoName, &ecosystem, &repoURL)
	if err != nil {
		fmt.Printf("DB Error: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch scan info"})
	}

	actualRepoURL := ""
	if repoURL != nil {
		actualRepoURL = *repoURL
	}

	// Ecosystem might be tricky if we don't store it on scan. Let's try to infer from components if not available
	// Actually we didn't save ecosystem on the scan row, but let's query the first component's ecosystem
	var eco string
	h.db.QueryRowContext(c.Context(), `SELECT ecosystem FROM components WHERE scan_id = $1 LIMIT 1`, scanID).Scan(&eco)
	if eco != "" {
		ecosystem = eco
	}

	scanInfo := deptic.ScanInfo{
		ID:        scanID,
		RepoName:  repoName,
		RepoURL:   actualRepoURL,
		Ecosystem: ecosystem,
	}

	// 1b. Fetch components
	rows, err := h.db.QueryContext(c.Context(), "SELECT name, version, ecosystem, license, depth, parent_name FROM components WHERE scan_id = $1", scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch components"})
	}
	defer rows.Close()

	var components []scanner.Package
	for rows.Next() {
		var p scanner.Package
		var lic, parent *string
		if err := rows.Scan(&p.Name, &p.Version, &p.Ecosystem, &lic, &p.Depth, &parent); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to scan component"})
		}
		if lic != nil {
			p.License = *lic
		}
		if parent != nil {
			p.ParentName = *parent
		}
		components = append(components, p)
	}

	// 1c. Fetch vulns
	// Querying vulnerabilities for all components in this scan
	vulnRows, err := h.db.QueryContext(c.Context(), `
		SELECT cv.cve_id, cv.severity, cv.summary, cv.fixed_version 
		FROM component_vulnerabilities cv
		JOIN components c ON c.id = cv.component_id
		WHERE c.scan_id = $1`, scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch vulnerabilities"})
	}
	defer vulnRows.Close()

	var vulns []vuln.ComponentVuln
	for vulnRows.Next() {
		var v vuln.ComponentVuln
		var summary, fixed *string
		if err := vulnRows.Scan(&v.CVEID, &v.Severity, &summary, &fixed); err != nil {
			fmt.Printf("DB Scan Error: %v\n", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to scan vulnerability"})
		}
		if summary != nil {
			v.Summary = *summary
		}
		if fixed != nil {
			v.FixedVersion = *fixed
		}
		vulns = append(vulns, v)
	}

	// 2. Generate DEPTIC
	var fileBytes []byte
	var sha256Hash string
	var contentType string
	var specVersion string
	var ext string

	if req.Format == "cyclonedx" {
		fileBytes, sha256Hash, err = deptic.GenerateCycloneDX(scanInfo, components, vulns)
		contentType = "application/json"
		specVersion = "1.5"
		ext = "json"
	} else if req.Format == "spdx" {
		fileBytes, sha256Hash, err = deptic.GenerateSPDX(scanInfo, components)
		contentType = "text/spdx"
		specVersion = "2.3"
		ext = "spdx"
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate DEPTIC", "details": err.Error()})
	}

	// 3. Save to database (skip E2 upload — serve file directly)
	depticID := uuid.New().String()
	fileKey := fmt.Sprintf("deptics/%s/%s-%s.%s", scanID, req.Format, time.Now().UTC().Format("20060102150405"), ext)

	_, dbErr := h.db.ExecContext(c.Context(), `
		INSERT INTO deptics (id, scan_id, format, spec_version, file_key, sha256_hash, component_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		depticID, scanID, req.Format, specVersion, fileKey, sha256Hash, len(components))

	if dbErr != nil {
		fmt.Printf("Failed to insert deptic into db: %v\n", dbErr)
	}

	// 4. Return file directly as download
	filename := fmt.Sprintf("%s-%s.%s", req.Format, scanID[:8], ext)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Set("Content-Type", contentType)
	c.Set("X-Deptic-ID", depticID)
	c.Set("X-Deptic-SHA256", sha256Hash)
	c.Set("X-Component-Count", fmt.Sprintf("%d", len(components)))
	return c.Send(fileBytes)
}

// HandleDownloadDEPTIC handles GET /api/deptics/:depticID/download
func (h *ScanHandler) HandleDownloadDEPTIC(c *fiber.Ctx) error {
	depticID := c.Params("depticID")

	var fileKey string
	err := h.db.QueryRowContext(c.Context(), "SELECT file_key FROM deptics WHERE id = $1", depticID).Scan(&fileKey)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "DEPTIC not found"})
	}

	e2Client, err := storage.NewE2Client()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize storage client", "details": err.Error()})
	}

	downloadURL, err := storage.GetPresignedURL(context.Background(), e2Client, fileKey, time.Hour)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate download URL", "details": err.Error()})
	}

	return c.Redirect(downloadURL, fiber.StatusFound)
}
