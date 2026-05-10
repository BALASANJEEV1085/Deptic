package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"

	"github.com/sbom-io/api/internal/compliance"
	"github.com/sbom-io/api/internal/db"
	"github.com/sbom-io/api/internal/github"
	"github.com/sbom-io/api/internal/scanner"
	"github.com/sbom-io/api/internal/vuln"
)

// JWTAuthMiddleware validates Supabase JWTs using the JWKS endpoint (supports ES256)
func JWTAuthMiddleware() fiber.Handler {
	supabaseURL := os.Getenv("SUPABASE_URL")
	// Supabase JWKS lives under /auth/v1/, NOT root /.well-known/
	jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"

	fmt.Printf("Fetching JWKS from: %s\n", jwksURL)
	jwks, err := keyfunc.Get(jwksURL, keyfunc.Options{})
	if err != nil {
		fmt.Printf("Warning: failed to fetch JWKS: %v — falling back to HMAC\n", err)
		jwks = nil
	} else {
		fmt.Printf("Successfully loaded JWKS\n")
	}

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing or invalid authorization header"})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		var token *jwt.Token
		var parseErr error

		if jwks != nil {
			// Preferred: verify using Supabase JWKS (supports ES256 & RS256)
			token, parseErr = jwt.Parse(tokenString, jwks.Keyfunc)
		} else {
			// Fallback: HMAC secret
			secret := os.Getenv("SUPABASE_JWT_SECRET")
			token, parseErr = jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
				}
				return []byte(secret), nil
			})
		}

		if parseErr != nil {
			fmt.Printf("JWT validation failed: %v\n", parseErr)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token", "details": parseErr.Error()})
		}

		if !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token"})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid claims"})
		}

		sub, ok := claims["sub"].(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing subject in token"})
		}

		c.Locals("user_id", sub)
		return c.Next()
	}
}

// ScanHandler manages scan endpoints
type ScanHandler struct {
	db  *sql.DB
	rdb *redis.Client
}

// RegisterRoutes registers the scan endpoints to the provided Fiber router
func RegisterRoutes(api fiber.Router, database *sql.DB, redisClient *redis.Client) {
	h := &ScanHandler{db: database, rdb: redisClient}

	// Public routes (no auth)
	api.Get("/share/:token", h.HandleViewShareLink)

	// Apply JWT middleware to subsequent routes
	api.Use(JWTAuthMiddleware())

	api.Post("/scans", h.HandleCreateScan)
	api.Get("/scans", h.HandleListAllScans)
	api.Get("/scans/:scanID", h.HandleGetScan)
	api.Get("/scans/:scanID/vulnerabilities", h.HandleGetScanVulnerabilities)
	api.Post("/scans/:scanID/sbom", h.HandleGenerateSBOM)
	api.Get("/vulnerabilities", h.HandleGetAllVulnerabilities)
	api.Get("/projects/:projectID/scans", h.HandleListScans)
	api.Get("/dashboard/stats", h.HandleGetDashboardStats)
	api.Get("/sboms/:sbomID/download", h.HandleDownloadSBOM)
	api.Post("/sboms/:sbomID/share", h.HandleCreateShareLink)
	api.Get("/sboms/:sbomID/shares", h.HandleListShareLinks)
	api.Get("/scans/:scanID/shares", h.HandleListScanShareLinks)
	api.Get("/scans/:scanID/compliance", h.GetCompliance)
	api.Delete("/sboms/:sbomID/shares/:token", h.HandleRevokeShareLink)
}

type createScanRequest struct {
	GithubURL string `json:"github_url"`
	ProjectID string `json:"project_id"`
}

// HandleCreateScan handles POST /api/scans
func (h *ScanHandler) HandleCreateScan(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req createScanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.GithubURL == "" || req.ProjectID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "github_url and project_id are required"})
	}

	owner, repo, err := github.ParseRepoURL(req.GithubURL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid GitHub URL"})
	}

	// Fetch GitHub OAuth token from Supabase auth.identities
	var providerToken sql.NullString
	err = h.db.QueryRowContext(c.Context(), `
		SELECT identity_data->>'provider_token' 
		FROM auth.identities 
		WHERE user_id = $1 AND provider = 'github'
		LIMIT 1
	`, userID).Scan(&providerToken)

	if err != nil && err != sql.ErrNoRows {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch GitHub token"})
	}

	githubToken := providerToken.String

	// Create or fetch the user's default project to satisfy the FK constraint
	projectID, err := db.CreateOrGetDefaultProject(c.Context(), h.db, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create project: " + err.Error()})
	}

	// Create scan record in database
	scanID, err := db.CreateScan(c.Context(), h.db, projectID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create scan record"})
	}

	// Launch scan in background
	go func() {
		// Use a disconnected background context because Fiber context gets cancelled when response is sent
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()

		ghClient := github.NewClient(githubToken)

		var packages []scanner.Package
		var err error
		ecosystem := ""

		// Step 1: package.json
		pkgBytes, errPkg := ghClient.FetchFile(ctx, owner, repo, "package.json")
		if errPkg == nil {
			ecosystem = "npm"
			packages, err = scanner.ScanNPM(ctx, h.rdb, pkgBytes)
		} else {
			// Step 2: requirements.txt
			reqBytes, errReq := ghClient.FetchFile(ctx, owner, repo, "requirements.txt")
			if errReq == nil {
				ecosystem = "pip"
				packages, err = scanner.ScanPip(ctx, h.rdb, reqBytes, "requirements.txt")
			} else {
				// Step 3: pyproject.toml
				tomlBytes, errToml := ghClient.FetchFile(ctx, owner, repo, "pyproject.toml")
				if errToml == nil {
					ecosystem = "pip"
					packages, err = scanner.ScanPip(ctx, h.rdb, tomlBytes, "pyproject.toml")
				} else {
					// Step 4: none found
					_ = db.UpdateScanStatus(ctx, h.db, scanID, "failed")
					fmt.Printf("no supported manifest found in repo\n")
					return
				}
			}
		}

		if err != nil {
			_ = db.UpdateScanStatus(ctx, h.db, scanID, "failed")
			fmt.Printf("Scan failed parsing %s: %v\n", ecosystem, err)
			return
		}

		// 3. Save resolved components
		if err := db.SaveComponents(ctx, h.db, scanID, packages); err != nil {
			_ = db.UpdateScanStatus(ctx, h.db, scanID, "failed")
			fmt.Printf("Scan failed saving components: %v\n", err)
			return
		}

		// 4. Vulnerability Matcher
		vulns, err := vuln.MatchVulnerabilities(ctx, h.db, scanID)
		if err == nil && len(vulns) > 0 {
			if err := vuln.SaveComponentVulns(ctx, h.db, vulns); err != nil {
				fmt.Printf("Failed to save vulnerabilities: %v\n", err)
			}
		}

		// 5. NTIA Compliance Check
		sbomMeta := compliance.SBOMMeta{
			AuthorName:  "SBOM.io",
			AuthorTool:  "sbom-io-scanner v1.0.0",
			GeneratedAt: time.Now(),
			RepoName:    repo,
		}
		ntiaResult := compliance.CheckNTIA(packages, sbomMeta)
		euCompliant := compliance.CheckEUCRA(ntiaResult)

		detailBytes, _ := json.Marshal(ntiaResult)
		if err := db.UpdateScanCompliance(ctx, h.db, scanID, ntiaResult.Score, ntiaResult.Compliant, euCompliant, detailBytes); err != nil {
			fmt.Printf("Failed to save scan compliance: %v\n", err)
		}

		// 6. Finalize scan status
		_ = db.UpdateScanStatus(ctx, h.db, scanID, "done")
		fmt.Printf("Scan done: %d components, ecosystem=%s\n", len(packages), ecosystem)
	}()

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"scan_id": scanID,
		"status":  "running",
	})
}

// HandleGetScan handles GET /api/scans/:scanID
func (h *ScanHandler) HandleGetScan(c *fiber.Ctx) error {
	scanID := c.Params("scanID")
	// Note: in a fully secure environment, we should verify the user owns the project this scan belongs to.

	scan, components, err := db.GetScanWithComponents(c.Context(), h.db, scanID)
	if err != nil {
		if err.Error() == "scan not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Scan not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if components == nil {
		components = []db.Component{}
	}

	return c.JSON(fiber.Map{
		"scan":       scan,
		"components": components,
		"total":      len(components),
	})
}

// HandleListScans handles GET /api/projects/:projectID/scans
func (h *ScanHandler) HandleListScans(c *fiber.Ctx) error {
	projectID := c.Params("projectID")
	
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT id, project_id, status, created_at 
		FROM scans 
		WHERE project_id = $1 
		ORDER BY created_at DESC
	`, projectID)
	
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query scans"})
	}
	defer rows.Close()

	var scans []db.Scan
	for rows.Next() {
		var s db.Scan
		if err := rows.Scan(&s.ID, &s.ProjectID, &s.Status, &s.CreatedAt); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse scan row"})
		}
		scans = append(scans, s)
	}

	if err := rows.Err(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed iterating scan rows"})
	}

	if scans == nil {
		scans = []db.Scan{}
	}

	return c.JSON(fiber.Map{
		"scans": scans,
		"total": len(scans),
	})
}

// HandleGetDashboardStats handles GET /api/dashboard/stats
func (h *ScanHandler) HandleGetDashboardStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var totalScans int
	if err := h.db.QueryRowContext(c.Context(), `
		SELECT count(*) 
		FROM scans s 
		JOIN projects p ON s.project_id = p.id 
		WHERE p.user_id = $1
	`, userID).Scan(&totalScans); err != nil {
		totalScans = 0
	}
	
	var totalProjects int
	if err := h.db.QueryRowContext(c.Context(), "SELECT count(*) FROM projects WHERE user_id = $1", userID).Scan(&totalProjects); err != nil {
		totalProjects = 0
	}

	var criticalCves int
	if err := h.db.QueryRowContext(c.Context(), `
		SELECT count(*) 
		FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1 AND cv.severity = 'CRITICAL'
	`, userID).Scan(&criticalCves); err != nil {
		criticalCves = 0
	}

	// Compliant Systems: Projects with no critical vulnerabilities in their latest scans
	var cleanProjects int
	if err := h.db.QueryRowContext(c.Context(), `
		SELECT count(DISTINCT p.id)
		FROM projects p
		WHERE p.user_id = $1 AND p.id NOT IN (
			SELECT DISTINCT s.project_id
			FROM scans s
			JOIN components c ON s.id = c.scan_id
			JOIN component_vulnerabilities cv ON c.id = cv.component_id
			WHERE cv.severity = 'CRITICAL'
		)
	`, userID).Scan(&cleanProjects); err != nil {
		cleanProjects = 0
	}
	
	return c.JSON(fiber.Map{
		"totalProjects": totalProjects,
		"totalScans":    totalScans,
		"criticalCves":  criticalCves,
		"cleanProjects": cleanProjects,
	})
}

// HandleListAllScans handles GET /api/scans — returns all scans for the authenticated user
func (h *ScanHandler) HandleListAllScans(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := h.db.QueryContext(c.Context(), `
		SELECT s.id, s.project_id, s.status, s.created_at
		FROM scans s
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1
		ORDER BY s.created_at DESC
	`, userID)

	if err != nil {
		// Fallback: return all scans if projects join fails (e.g. no projects table)
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT id, project_id, status, created_at FROM scans ORDER BY created_at DESC LIMIT 100
		`)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query scans"})
		}
	}
	defer rows.Close()

	var scans []db.Scan
	for rows.Next() {
		var s db.Scan
		if err := rows.Scan(&s.ID, &s.ProjectID, &s.Status, &s.CreatedAt); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse scan row"})
		}
		scans = append(scans, s)
	}

	if scans == nil {
		scans = []db.Scan{}
	}

	return c.JSON(fiber.Map{
		"scans": scans,
		"total": len(scans),
	})
}

// Response structure
type VulnerabilityResponse struct {
	ProjectName      string `json:"project_name,omitempty"`
	ScanID           string `json:"scan_id,omitempty"`
	ComponentName    string `json:"component_name"`
	ComponentVersion string `json:"component_version"`
	CVEID            string `json:"cve_id"`
	Severity         string `json:"severity"`
	Summary          string `json:"summary"`
	FixedVersion     string `json:"fixed_version"`
}

type ScanVulnResponse struct {
	Summary struct {
		Critical int `json:"critical"`
		High     int `json:"high"`
		Medium   int `json:"medium"`
		Low      int `json:"low"`
	} `json:"summary"`
	Vulnerabilities []VulnerabilityResponse `json:"vulnerabilities"`
}

// HandleGetScanVulnerabilities handles GET /api/scans/:scanID/vulnerabilities
func (h *ScanHandler) HandleGetScanVulnerabilities(c *fiber.Ctx) error {
	scanID := c.Params("scanID")

	critical, high, medium, low, err := vuln.GetScanVulnSummary(c.Context(), h.db, scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get vulnerability summary"})
	}

	query := `
		SELECT c.name, c.version, cv.cve_id, cv.severity, cv.summary, cv.fixed_version
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
	`
	rows, err := h.db.QueryContext(c.Context(), query, scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query vulnerabilities"})
	}
	defer rows.Close()

	var vulns []VulnerabilityResponse
	for rows.Next() {
		var v VulnerabilityResponse
		if err := rows.Scan(&v.ComponentName, &v.ComponentVersion, &v.CVEID, &v.Severity, &v.Summary, &v.FixedVersion); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse vulnerability row"})
		}
		vulns = append(vulns, v)
	}

	if vulns == nil {
		vulns = []VulnerabilityResponse{}
	}

	res := ScanVulnResponse{
		Vulnerabilities: vulns,
	}
	res.Summary.Critical = critical
	res.Summary.High = high
	res.Summary.Medium = medium
	res.Summary.Low = low

	return c.JSON(res)
}

// HandleGetAllVulnerabilities handles GET /api/vulnerabilities
func (h *ScanHandler) HandleGetAllVulnerabilities(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	query := `
		SELECT p.name, s.id, c.name, c.version, cv.cve_id, cv.severity, cv.summary, cv.fixed_version
		FROM component_vulnerabilities cv
		JOIN components c ON c.id = cv.component_id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1
		ORDER BY s.created_at DESC
		LIMIT 500
	`
	rows, err := h.db.QueryContext(c.Context(), query, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query vulnerabilities"})
	}
	defer rows.Close()

	var vulns []VulnerabilityResponse
	for rows.Next() {
		var v VulnerabilityResponse
		if err := rows.Scan(&v.ProjectName, &v.ScanID, &v.ComponentName, &v.ComponentVersion, &v.CVEID, &v.Severity, &v.Summary, &v.FixedVersion); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse vulnerability row"})
		}
		vulns = append(vulns, v)
	}

	if vulns == nil {
		vulns = []VulnerabilityResponse{}
	}

	return c.JSON(fiber.Map{
		"vulnerabilities": vulns,
	})
}
