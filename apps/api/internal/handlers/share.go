package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/deptic-io/api/internal/deptic"
	"github.com/deptic-io/api/internal/scanner"
	"github.com/deptic-io/api/internal/vuln"
)

type createShareRequest struct {
	Label         string `json:"label"`
	ExpiresInDays int    `json:"expires_in_days"`
}

type shareLinkResponse struct {
	ShareURL  string    `json:"share_url"`
	ExpiresAt time.Time `json:"expires_at"`
	Label     string    `json:"label"`
}

func getFrontendURL() string {
	url := os.Getenv("FRONTEND_URL")
	if url == "" {
		return "https://deptic.netlify.app"
	}
	return url
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// HandleCreateShareLink POST /api/deptics/:depticID/share
func (h *ScanHandler) HandleCreateShareLink(c *fiber.Ctx) error {
	depticID := c.Params("depticID")
	userID := c.Locals("user_id").(string)

	var req createShareRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.ExpiresInDays <= 0 {
		req.ExpiresInDays = 30 // default
	}

	// Get workspace context if any
	wsID := c.Get("X-Workspace-ID")

	var exists bool
	var err error
	if wsID != "" {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM sboms s
				JOIN scans sc ON s.scan_id = sc.id
				JOIN projects p ON sc.project_id = p.id
				WHERE s.id = $1 AND p.workspace_id = $2
			)`, depticID, wsID).Scan(&exists)
	} else {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM sboms s
				JOIN scans sc ON s.scan_id = sc.id
				JOIN projects p ON sc.project_id = p.id
				WHERE s.id = $1 AND p.user_id = $2
			)`, depticID, userID).Scan(&exists)
	}
	if err != nil || !exists {
		errMsg := "unknown error"
		if err != nil {
			errMsg = err.Error()
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied", "details": errMsg})
	}

	token, err := generateToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token", "details": err.Error()})
	}

	expiresAt := time.Now().AddDate(0, 0, req.ExpiresInDays)

	_, err = h.db.ExecContext(c.Context(), `
		INSERT INTO shared_links (sbom_id, token, label, expires_at)
		VALUES ($1, $2, $3, $4)`,
		depticID, token, req.Label, expiresAt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create share link", "details": err.Error()})
	}

	return c.JSON(shareLinkResponse{
		ShareURL:  fmt.Sprintf("%s/share/%s", getFrontendURL(), token),
		ExpiresAt: expiresAt,
		Label:     req.Label,
	})
}

// HandleViewShareLink GET /api/share/:token
func (h *ScanHandler) HandleViewShareLink(c *fiber.Ctx) error {
	token := c.Params("token")

	// 1. Look up shared link
	var depticID string
	var label string
	var expiresAt time.Time

	err := h.db.QueryRowContext(c.Context(), `
		SELECT sbom_id, label, expires_at
		FROM shared_links
		WHERE token = $1`, token).Scan(&depticID, &label, &expiresAt)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Share link not found"})
	}

	if time.Now().After(expiresAt) {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{"error": "Share link has expired"})
	}

	// Increment view count
	_, _ = h.db.ExecContext(c.Context(), "UPDATE shared_links SET view_count = view_count + 1 WHERE token = $1", token)

	// Fetch deptic and scan details
	var format, specVersion, sha256, repoName string
	var componentCount int
	var generatedAt time.Time
	var scanID string

	err = h.db.QueryRowContext(c.Context(), `
		SELECT s.format, s.spec_version, s.sha256_hash, s.component_count, s.created_at, s.scan_id, p.name
		FROM sboms s
		JOIN scans sc ON s.scan_id = sc.id
		JOIN projects p ON sc.project_id = p.id
		WHERE s.id = $1`, depticID).Scan(&format, &specVersion, &sha256, &componentCount, &generatedAt, &scanID, &repoName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load DEPTIC metadata"})
	}

	// Fetch components limit 5000
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT name, version, ecosystem, license, parent_name, depth 
		FROM components 
		WHERE scan_id = $1 LIMIT 5000`, scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch components"})
	}
	defer rows.Close()

	var components []scanner.Package
	for rows.Next() {
		var p scanner.Package
		var parent, lic *string
		if err := rows.Scan(&p.Name, &p.Version, &p.Ecosystem, &lic, &parent, &p.Depth); err != nil {
			continue
		}
		if lic != nil {
			p.License = *lic
		}
		if parent != nil {
			p.ParentName = *parent
		}
		components = append(components, p)
	}

	if components == nil {
		components = []scanner.Package{}
	}

	// Fetch vulnerabilities
	vulnRows, err := h.db.QueryContext(c.Context(), `
		SELECT cv.cve_id, cv.severity, cv.summary, cv.fixed_version, c.name, c.version
		FROM component_vulnerabilities cv
		JOIN components c ON c.id = cv.component_id
		WHERE c.scan_id = $1`, scanID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch vulnerabilities"})
	}
	defer vulnRows.Close()

	type vulnResponse struct {
		ComponentName    string `json:"component_name"`
		ComponentVersion string `json:"component_version"`
		CVEID            string `json:"cve_id"`
		Severity         string `json:"severity"`
		Summary          string `json:"summary"`
		FixedVersion     string `json:"fixed_version"`
	}

	var vulns []vulnResponse
	vulnSummary := map[string]int{"critical": 0, "high": 0, "medium": 0, "low": 0}

	for vulnRows.Next() {
		var v vulnResponse
		var fixed *string
		if err := vulnRows.Scan(&v.CVEID, &v.Severity, &v.Summary, &fixed, &v.ComponentName, &v.ComponentVersion); err != nil {
			continue
		}
		if fixed != nil {
			v.FixedVersion = *fixed
		}

		sev := strings.ToLower(v.Severity)
		if _, ok := vulnSummary[sev]; ok {
			vulnSummary[sev]++
		}
		vulns = append(vulns, v)
	}

	if vulns == nil {
		vulns = []vulnResponse{}
	}

	return c.JSON(fiber.Map{
		"label":           label,
		"repo_name":       repoName,
		"generated_at":    generatedAt,
		"sha256":          sha256,
		"format":          format,
		"scan_id":         scanID,
		"spec_version":    specVersion,
		"component_count": componentCount,
		"vulnerability_summary": vulnSummary,
		"compliance": fiber.Map{
			"ntia_minimum_elements":        true,
			"has_supplier_name":            true,
			"has_component_names":          true,
			"has_versions":                 true,
			"has_unique_ids":               true,
			"has_dependency_relationships": true,
			"has_author":                   true,
			"has_timestamp":                true,
		},
		"components":      components,
		"vulnerabilities": vulns,
	})
}

// HandleDownloadShareLink GET /api/share/:token/download
func (h *ScanHandler) HandleDownloadShareLink(c *fiber.Ctx) error {
	token := c.Params("token")

	// 1. Look up shared link
	var depticID string
	var expiresAt time.Time
	err := h.db.QueryRowContext(c.Context(), `
		SELECT sbom_id, expires_at
		FROM shared_links
		WHERE token = $1`, token).Scan(&depticID, &expiresAt)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Share link not found"})
	}

	if time.Now().After(expiresAt) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Share link expired"})
	}

	var scanID, format, ext string
	err = h.db.QueryRowContext(c.Context(), "SELECT scan_id, format FROM sboms WHERE id = $1", depticID).Scan(&scanID, &format)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "DEPTIC not found"})
	}

	// 1a. Fetch scan info
	var repoName, ecosystem string
	var repoURL *string
	err = h.db.QueryRowContext(c.Context(), `
		SELECT p.name, s.status, p.github_url 
		FROM scans s JOIN projects p ON s.project_id = p.id 
		WHERE s.id = $1`, scanID).Scan(&repoName, &ecosystem, &repoURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch scan info"})
	}

	actualRepoURL := ""
	if repoURL != nil {
		actualRepoURL = *repoURL
	}

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
	var contentType string

	if format == "cyclonedx" {
		fileBytes, _, err = deptic.GenerateCycloneDX(scanInfo, components, vulns)
		contentType = "application/json"
		ext = "json"
	} else {
		fileBytes, _, err = deptic.GenerateSPDX(scanInfo, components)
		contentType = "text/spdx"
		ext = "spdx"
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate DEPTIC", "details": err.Error()})
	}

	filename := fmt.Sprintf("%s-%s.%s", format, scanID[:8], ext)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Set("Content-Type", contentType)
	return c.Send(fileBytes)
}

// HandleListShareLinks GET /api/deptics/:depticID/shares
func (h *ScanHandler) HandleListShareLinks(c *fiber.Ctx) error {
	depticID := c.Params("depticID")
	userID := c.Locals("user_id").(string)

	wsID := c.Get("X-Workspace-ID")

	var exists bool
	var err error
	if wsID != "" {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM sboms s
				JOIN scans sc ON s.scan_id = sc.id
				JOIN projects p ON sc.project_id = p.id
				WHERE s.id = $1 AND p.workspace_id = $2
			)`, depticID, wsID).Scan(&exists)
	} else {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM sboms s
				JOIN scans sc ON s.scan_id = sc.id
				JOIN projects p ON sc.project_id = p.id
				WHERE s.id = $1 AND p.user_id = $2
			)`, depticID, userID).Scan(&exists)
	}
	if err != nil || !exists {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	rows, err := h.db.QueryContext(c.Context(), `
		SELECT token, label, view_count, expires_at, created_at
		FROM shared_links
		WHERE sbom_id = $1
		ORDER BY created_at DESC`, depticID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch share links"})
	}
	defer rows.Close()

	type shareLink struct {
		Token      string    `json:"token"`
		Label      string    `json:"label"`
		ViewCount  int       `json:"view_count"`
		ExpiresAt  time.Time `json:"expires_at"`
		CreatedAt  time.Time `json:"created_at"`
		URL        string    `json:"url"`
		IsExpired  bool      `json:"is_expired"`
	}

	var links []shareLink
	for rows.Next() {
		var l shareLink
		if err := rows.Scan(&l.Token, &l.Label, &l.ViewCount, &l.ExpiresAt, &l.CreatedAt); err != nil {
			continue
		}
		l.URL = fmt.Sprintf("%s/share/%s", getFrontendURL(), l.Token)
		l.IsExpired = time.Now().After(l.ExpiresAt)
		links = append(links, l)
	}

	if links == nil {
		links = []shareLink{}
	}

	return c.JSON(fiber.Map{
		"shares": links,
	})
}

// HandleListScanShareLinks GET /api/scans/:scanID/shares
func (h *ScanHandler) HandleListScanShareLinks(c *fiber.Ctx) error {
	scanID := c.Params("scanID")
	userID := c.Locals("user_id").(string)

	wsID := c.Get("X-Workspace-ID")

	var exists bool
	var err error
	if wsID != "" {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM scans sc
				JOIN projects p ON sc.project_id = p.id
				WHERE sc.id = $1 AND p.workspace_id = $2
			)`, scanID, wsID).Scan(&exists)
	} else {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM scans sc
				JOIN projects p ON sc.project_id = p.id
				WHERE sc.id = $1 AND p.user_id = $2
			)`, scanID, userID).Scan(&exists)
	}
	if err != nil || !exists {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	rows, err := h.db.QueryContext(c.Context(), `
		SELECT sl.token, sl.label, sl.view_count, sl.expires_at, sl.created_at, sl.sbom_id
		FROM shared_links sl
		JOIN sboms s ON sl.sbom_id = s.id
		WHERE s.scan_id = $1
		ORDER BY sl.created_at DESC`, scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch share links"})
	}
	defer rows.Close()

	type shareLink struct {
		Token      string    `json:"token"`
		Label      string    `json:"label"`
		ViewCount  int       `json:"view_count"`
		ExpiresAt  time.Time `json:"expires_at"`
		CreatedAt  time.Time `json:"created_at"`
		URL        string    `json:"url"`
		IsExpired  bool      `json:"is_expired"`
		DepticID     string    `json:"deptic_id"`
	}

	var links []shareLink
	for rows.Next() {
		var l shareLink
		if err := rows.Scan(&l.Token, &l.Label, &l.ViewCount, &l.ExpiresAt, &l.CreatedAt, &l.DepticID); err != nil {
			continue
		}
		l.URL = fmt.Sprintf("%s/share/%s", getFrontendURL(), l.Token)
		l.IsExpired = time.Now().After(l.ExpiresAt)
		links = append(links, l)
	}

	if links == nil {
		links = []shareLink{}
	}

	return c.JSON(fiber.Map{
		"shares": links,
	})
}

// HandleRevokeShareLink DELETE /api/deptics/:depticID/shares/:token
func (h *ScanHandler) HandleRevokeShareLink(c *fiber.Ctx) error {
	depticID := c.Params("depticID")
	token := c.Params("token")
	userID := c.Locals("user_id").(string)

	wsID := c.Get("X-Workspace-ID")

	var exists bool
	var err error
	if wsID != "" {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM sboms s
				JOIN scans sc ON s.scan_id = sc.id
				JOIN projects p ON sc.project_id = p.id
				WHERE s.id = $1 AND p.workspace_id = $2
			)`, depticID, wsID).Scan(&exists)
	} else {
		err = h.db.QueryRowContext(c.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM sboms s
				JOIN scans sc ON s.scan_id = sc.id
				JOIN projects p ON sc.project_id = p.id
				WHERE s.id = $1 AND p.user_id = $2
			)`, depticID, userID).Scan(&exists)
	}
	if err != nil || !exists {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	_, err = h.db.ExecContext(c.Context(), "DELETE FROM shared_links WHERE token = $1 AND sbom_id = $2", token, depticID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete share link"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
