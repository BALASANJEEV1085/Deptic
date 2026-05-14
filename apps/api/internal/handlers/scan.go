package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
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
	api.Get("/projects", h.HandleListProjects)
	api.Get("/projects/:projectID/scans", h.HandleListScans)
	api.Get("/github/repos", h.HandleListGitHubRepos)
	api.Get("/dashboard/stats", h.HandleGetDashboardStats)
	api.Get("/sboms/:sbomID/download", h.HandleDownloadSBOM)
	api.Post("/sboms/:sbomID/share", h.HandleCreateShareLink)
	api.Get("/sboms/:sbomID/shares", h.HandleListShareLinks)
	api.Get("/scans/:scanID/shares", h.HandleListScanShareLinks)
	api.Get("/scans/:scanID/compliance", h.GetCompliance)
	api.Get("/scans/:scanID/report/pdf", h.DownloadPDFReport)
	api.Delete("/sboms/:sbomID/shares/:token", h.HandleRevokeShareLink)
}

func deriveRepoName(repoURL, id string) string {
	if repoURL != "" {
		parts := strings.Split(strings.TrimSuffix(repoURL, "/"), "/")
		if len(parts) >= 2 {
			return parts[len(parts)-2] + "/" + parts[len(parts)-1]
		}
		return repoURL
	}
	if len(id) >= 8 {
		return id[:8]
	}
	return id
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
	scanID, err := db.CreateScan(c.Context(), h.db, projectID, req.GithubURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create scan record"})
	}

	// Launch scan in background
	go func() {
		// Use a disconnected background context because Fiber context gets cancelled when response is sent
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()

		ghClient := github.NewClient(githubToken)

		allManifests, err := ghClient.FindAllManifests(ctx, owner, repo)
		if err != nil {
			_ = db.UpdateScanStatus(ctx, h.db, scanID, "failed", "")
			fmt.Printf("FindAllManifests error: %v\n", err)
			return
		}

		if len(allManifests) == 0 {
			_ = db.UpdateScanStatus(ctx, h.db, scanID, "failed", "")
			fmt.Printf("No supported manifest files found\n")
			return
		}

		manifestPaths := make([]string, len(allManifests))
		for i, m := range allManifests {
			manifestPaths[i] = m.Path
		}
		fmt.Printf("Found %d manifests: %v\n", len(allManifests), manifestPaths)

		var allPackages []scanner.Package
		var mu sync.Mutex
		var wg sync.WaitGroup

		// Scan each manifest
		for _, m := range allManifests {
			m := m
			wg.Add(1)
			go func() {
				defer wg.Done()
				var pkgs []scanner.Package
				var scanErr error

				switch m.Type {
				case "npm":
					pkgs, scanErr = scanner.ScanNPM(ctx, h.rdb, m.Data)
				case "pip":
					// Pip scanner might need filename to decide between requirements.txt and pyproject.toml
					filename := m.Path
					if idx := strings.LastIndex(m.Path, "/"); idx >= 0 {
						filename = m.Path[idx+1:]
					}
					pkgs, scanErr = scanner.ScanPip(ctx, h.rdb, m.Data, filename)
				case "maven":
					pkgs, scanErr = scanner.ScanMaven(ctx, h.rdb, m.Data)
				}

				if scanErr != nil {
					fmt.Printf("Warning: failed to scan %s (%s): %v\n", m.Path, m.Type, scanErr)
					return
				}

				// Tag with SourcePath
				for i := range pkgs {
					pkgs[i].SourcePath = m.Path
				}

				mu.Lock()
				allPackages = append(allPackages, pkgs...)
				mu.Unlock()
			}()
		}

		wg.Wait()

		if len(allPackages) == 0 {
			_ = db.UpdateScanStatus(ctx, h.db, scanID, "failed", "")
			fmt.Printf("No components found in %d manifests\n", len(allManifests))
			return
		}

		// Deduplicate packages by Name+Version+Ecosystem
		type pkgKey struct {
			Name      string
			Version   string
			Ecosystem string
		}
		uniquePkgs := make(map[pkgKey]scanner.Package)
		for _, p := range allPackages {
			key := pkgKey{Name: p.Name, Version: p.Version, Ecosystem: p.Ecosystem}
			if existing, ok := uniquePkgs[key]; ok {
				// Keep the shallower one
				if p.Depth < existing.Depth {
					uniquePkgs[key] = p
				}
			} else {
				uniquePkgs[key] = p
			}
		}

		allPackages = make([]scanner.Package, 0, len(uniquePkgs))
		ecosystemsMap := make(map[string]bool)
		for _, p := range uniquePkgs {
			allPackages = append(allPackages, p)
			ecosystemsMap[p.Ecosystem] = true
		}

		var ecosystemList []string
		for e := range ecosystemsMap {
			ecosystemList = append(ecosystemList, e)
		}
		ecosystemStr := strings.Join(ecosystemList, "+")

		// 3. Save resolved components
		if err := db.SaveComponents(ctx, h.db, scanID, allPackages); err != nil {
			_ = db.UpdateScanStatus(ctx, h.db, scanID, "failed", ecosystemStr)
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

		_, dbComps, err := db.GetScanWithComponents(ctx, h.db, scanID)
		var checkPackages []scanner.Package
		if err == nil {
			for _, c := range dbComps {
				checkPackages = append(checkPackages, scanner.Package{
					Name:        c.Name,
					Version:     c.Version,
					VersionSpec: c.VersionSpec,
					License:     c.License,
					Ecosystem:   c.Ecosystem,
					Depth:       c.Depth,
					ParentName:  c.ParentName,
					SourcePath:  c.SourcePath,
				})
			}
		} else {
			checkPackages = allPackages
		}

		log.Printf("CheckNTIA input: %d components", len(checkPackages))
		ntiaResult := compliance.CheckNTIA(checkPackages, sbomMeta)
		euCompliant := compliance.CheckEUCRA(ntiaResult)

		detailBytes, _ := json.Marshal(ntiaResult)
		if err := db.UpdateScanCompliance(ctx, h.db, scanID, ntiaResult.Score, ntiaResult.Compliant, euCompliant, detailBytes, req.GithubURL, ecosystemStr); err != nil {
			fmt.Printf("Warning: failed to save scan compliance: %v\n", err)
		}

		// 6. Finalize scan status
		_ = db.UpdateScanStatus(ctx, h.db, scanID, "done", ecosystemStr)
		fmt.Printf("Scan done: %d components, ecosystems=%s\n", len(allPackages), ecosystemStr)
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

	scan.RepoName = deriveRepoName(scan.RepoURL, scan.ID)

	// Fetch ecosystem breakdown
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT ecosystem, COUNT(*) as count,
		  SUM(CASE WHEN depth=0 THEN 1 ELSE 0 END) as direct,
		  SUM(CASE WHEN depth>0 THEN 1 ELSE 0 END) as transitive
		FROM components WHERE scan_id=$1
		GROUP BY ecosystem
	`, scanID)
	
	breakdown := make(map[string]interface{})
	var ecosystemList []string
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var eco string
			var count, direct, transitive int
			if err := rows.Scan(&eco, &count, &direct, &transitive); err == nil {
				breakdown[eco] = fiber.Map{
					"count":      count,
					"direct":     direct,
					"transitive": transitive,
				}
				ecosystemList = append(ecosystemList, eco)
			}
		}
	}

	// Fetch manifest files
	manifestRows, err := h.db.QueryContext(c.Context(), `
		SELECT DISTINCT source_path, ecosystem FROM components WHERE scan_id=$1 AND source_path != ''
	`, scanID)
	var manifestFiles []fiber.Map
	if err == nil {
		defer manifestRows.Close()
		for manifestRows.Next() {
			var path, eco string
			if err := manifestRows.Scan(&path, &eco); err == nil {
				manifestFiles = append(manifestFiles, fiber.Map{
					"path":      path,
					"ecosystem": eco,
				})
			}
		}
	}

	return c.JSON(fiber.Map{
		"scan":                scan,
		"components":          components,
		"total":               len(components),
		"ecosystems":          ecosystemList,
		"ecosystem_breakdown": breakdown,
		"manifest_files":      manifestFiles,
	})
}

// HandleListScans handles GET /api/projects/:projectID/scans
func (h *ScanHandler) HandleListScans(c *fiber.Ctx) error {
	projectID := c.Params("projectID")
	
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT s.id, s.project_id, s.status, s.created_at,
		       COALESCE(s.repo_url, ''), COALESCE(s.ecosystem, ''),
		       COALESCE(s.compliance_score, 0),
		       (SELECT COUNT(*) FROM components WHERE scan_id = s.id) as component_count,
		       (SELECT COUNT(*) FROM component_vulnerabilities cv JOIN components c ON cv.component_id = c.id WHERE c.scan_id = s.id AND cv.severity = 'CRITICAL') as critical_cves
		FROM scans s
		WHERE s.project_id = $1 
		ORDER BY s.created_at DESC
	`, projectID)
	
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query scans"})
	}
	defer rows.Close()

	var scans []db.Scan
	for rows.Next() {
		var s db.Scan
		if err := rows.Scan(&s.ID, &s.ProjectID, &s.Status, &s.CreatedAt, &s.RepoURL, &s.Ecosystem, &s.ComplianceScore, &s.ComponentCount, &s.CriticalCVEs); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse scan row"})
		}
		s.RepoName = deriveRepoName(s.RepoURL, s.ID)
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

	var totalProjects, totalScans, totalComponents int
	var criticalCves, highCves, mediumCves, lowCves int

	h.db.QueryRowContext(c.Context(), "SELECT count(*) FROM projects WHERE user_id = $1", userID).Scan(&totalProjects)
	
	h.db.QueryRowContext(c.Context(), `
		SELECT count(*) FROM scans s JOIN projects p ON s.project_id = p.id WHERE p.user_id = $1
	`, userID).Scan(&totalScans)

	h.db.QueryRowContext(c.Context(), `
		SELECT count(*) FROM components c JOIN scans s ON c.scan_id = s.id JOIN projects p ON s.project_id = p.id WHERE p.user_id = $1
	`, userID).Scan(&totalComponents)

	h.db.QueryRowContext(c.Context(), `
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1 AND cv.severity = 'CRITICAL'
	`, userID).Scan(&criticalCves)

	h.db.QueryRowContext(c.Context(), `
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1 AND cv.severity = 'HIGH'
	`, userID).Scan(&highCves)

	h.db.QueryRowContext(c.Context(), `
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1 AND cv.severity = 'MEDIUM'
	`, userID).Scan(&mediumCves)

	h.db.QueryRowContext(c.Context(), `
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1 AND cv.severity = 'LOW'
	`, userID).Scan(&lowCves)

	var cleanProjects int
	h.db.QueryRowContext(c.Context(), `
		SELECT count(DISTINCT p.id)
		FROM projects p
		WHERE p.user_id = $1 AND p.id NOT IN (
			SELECT DISTINCT s.project_id
			FROM scans s
			JOIN components c ON s.id = c.scan_id
			JOIN component_vulnerabilities cv ON c.id = cv.component_id
			WHERE cv.severity IN ('CRITICAL', 'HIGH')
		)
	`, userID).Scan(&cleanProjects)

	var compliant, nonCompliant int
	h.db.QueryRowContext(c.Context(), `
		SELECT 
			COUNT(*) FILTER (WHERE ntia_compliant = true),
			COUNT(*) FILTER (WHERE ntia_compliant = false OR ntia_compliant IS NULL)
		FROM scans s
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1
		  AND s.status = 'done'
	`, userID).Scan(&compliant, &nonCompliant)

	stats := fiber.Map{
		"total_projects":       totalProjects,
		"total_scans":          totalScans,
		"total_components":     totalComponents,
		"critical_cves":        criticalCves,
		"high_cves":            highCves,
		"medium_cves":          mediumCves,
		"low_cves":             lowCves,
		"ntia_compliant_scans": compliant,
		"non_compliant_scans":  nonCompliant,
		"clean_projects":       cleanProjects,
		"recent_scans":         []fiber.Map{},
	}

	// Fetch recent 5 scans with counts and metadata in one go
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT 
			s.id, s.status, s.created_at, COALESCE(s.repo_url, ''), COALESCE(s.ecosystem, 'unknown'),
			COALESCE(s.compliance_score, 0),
			(SELECT COUNT(*) FROM components WHERE scan_id = s.id) as component_count,
			(SELECT COUNT(*) FROM component_vulnerabilities cv JOIN components c ON cv.component_id = c.id WHERE c.scan_id = s.id AND cv.severity = 'CRITICAL') as critical_cves
		FROM scans s
		JOIN projects p ON p.id = s.project_id
		WHERE p.user_id = $1
		ORDER BY s.created_at DESC
		LIMIT 5
	`, userID)
	
	if err == nil {
		defer rows.Close()
		var recentScans []fiber.Map
		for rows.Next() {
			var scanID, status, repoURL, ecosystem string
			var createdAt time.Time
			var compCount, critCves, ntiaScore int
			
			if err := rows.Scan(&scanID, &status, &createdAt, &repoURL, &ecosystem, &ntiaScore, &compCount, &critCves); err == nil {
				recentScans = append(recentScans, fiber.Map{
					"id":              scanID,
					"repo_name":       deriveRepoName(repoURL, scanID),
					"ecosystem":       ecosystem,
					"status":          status,
					"component_count": compCount,
					"critical_cves":   critCves,
					"ntia_score":      ntiaScore,
					"created_at":      createdAt,
				})
			}
		}
		stats["recent_scans"] = recentScans
	} else {
		fmt.Printf("Error fetching recent scans: %v\n", err)
	}

	return c.JSON(stats)
}

// HandleListAllScans handles GET /api/scans — returns all scans with rich metadata
func (h *ScanHandler) HandleListAllScans(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := h.db.QueryContext(c.Context(), `
		SELECT s.id, s.project_id, s.status, s.created_at,
		       COALESCE(s.repo_url, ''), COALESCE(s.ecosystem, ''),
		       COALESCE(s.compliance_score, 0)
		FROM scans s
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1
		ORDER BY s.created_at DESC
	`, userID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query scans"})
	}
	defer rows.Close()

	var scans []fiber.Map
	for rows.Next() {
		var id, projectID, status, repoURL, ecosystem string
		var createdAt time.Time
		var ntiaScore int
		if err := rows.Scan(&id, &projectID, &status, &createdAt, &repoURL, &ecosystem, &ntiaScore); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse scan row"})
		}

		// Parse repo name from URL
		repoName := deriveRepoName(repoURL, id)

		if ecosystem == "" {
			ecosystem = "unknown"
		}

		// Component count
		var compCount int
		h.db.QueryRowContext(c.Context(), `SELECT count(*) FROM components WHERE scan_id = $1`, id).Scan(&compCount)

		// Vuln counts
		var critCves, highCves, medCves, lowCves int
		h.db.QueryRowContext(c.Context(), `
			SELECT
			  COUNT(*) FILTER (WHERE cv.severity='CRITICAL'),
			  COUNT(*) FILTER (WHERE cv.severity='HIGH'),
			  COUNT(*) FILTER (WHERE cv.severity='MEDIUM'),
			  COUNT(*) FILTER (WHERE cv.severity='LOW')
			FROM component_vulnerabilities cv
			JOIN components c ON cv.component_id = c.id
			WHERE c.scan_id = $1
		`, id).Scan(&critCves, &highCves, &medCves, &lowCves)

		scans = append(scans, fiber.Map{
			"id":              id,
			"project_id":      projectID,
			"status":          status,
			"created_at":      createdAt,
			"repo_url":        repoURL,
			"repo_name":       repoName,
			"ecosystem":       ecosystem,
			"ntia_score":      ntiaScore,
			"ntia_compliant":  ntiaScore == 100, // Derived if not in query
			"component_count": compCount,
			"critical_cves":   critCves,
			"high_cves":       highCves,
			"medium_cves":     medCves,
			"low_cves":        lowCves,
		})
	}

	if scans == nil {
		scans = []fiber.Map{}
	}

	return c.JSON(fiber.Map{
		"scans": scans,
		"total": len(scans),
	})
}

// HandleListProjects handles GET /api/projects — groups scans by github_url
func (h *ScanHandler) HandleListProjects(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Get the latest scan per github_url for this user
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT DISTINCT ON (s.repo_url)
			s.id, s.repo_url, COALESCE(s.ecosystem,''), s.status, s.created_at,
			COALESCE(s.compliance_score,0)
		FROM scans s
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1 AND s.repo_url IS NOT NULL AND s.repo_url != ''
		ORDER BY s.repo_url, s.created_at DESC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query projects"})
	}
	defer rows.Close()

	var projects []fiber.Map
	for rows.Next() {
		var id, repoURL, ecosystem, status string
		var createdAt time.Time
		var ntiaScore int
		if err := rows.Scan(&id, &repoURL, &ecosystem, &status, &createdAt, &ntiaScore); err != nil {
			continue
		}

		repoName := repoURL
		parts := strings.Split(strings.TrimSuffix(repoURL, "/"), "/")
		if len(parts) >= 2 {
			repoName = parts[len(parts)-2] + "/" + parts[len(parts)-1]
		}
		if ecosystem == "" {
			ecosystem = "unknown"
		}

		var compCount int
		h.db.QueryRowContext(c.Context(), `SELECT count(*) FROM components WHERE scan_id = $1`, id).Scan(&compCount)

		var critCves, highCves, medCves, lowCves int
		h.db.QueryRowContext(c.Context(), `
			SELECT
			  COUNT(*) FILTER (WHERE cv.severity='CRITICAL'),
			  COUNT(*) FILTER (WHERE cv.severity='HIGH'),
			  COUNT(*) FILTER (WHERE cv.severity='MEDIUM'),
			  COUNT(*) FILTER (WHERE cv.severity='LOW')
			FROM component_vulnerabilities cv
			JOIN components c ON cv.component_id = c.id
			WHERE c.scan_id = $1
		`, id).Scan(&critCves, &highCves, &medCves, &lowCves)

		projects = append(projects, fiber.Map{
			"latest_scan_id":  id,
			"repo_url":        repoURL,
			"repo_name":       repoName,
			"ecosystem":       ecosystem,
			"status":          status,
			"created_at":      createdAt,
			"ntia_score":      ntiaScore,
			"component_count": compCount,
			"critical_cves":   critCves,
			"high_cves":       highCves,
			"medium_cves":     medCves,
			"low_cves":        lowCves,
		})
	}

	if projects == nil {
		projects = []fiber.Map{}
	}
	return c.JSON(fiber.Map{"projects": projects, "total": len(projects)})
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
		SELECT COALESCE(s.repo_url,''), s.id, c.name, c.version, cv.cve_id, cv.severity, cv.summary, cv.fixed_version
		FROM component_vulnerabilities cv
		JOIN components c ON c.id = cv.component_id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE p.user_id = $1
		ORDER BY
			CASE cv.severity
				WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5
			END ASC,
			s.created_at DESC
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
		var repoURL string
		if err := rows.Scan(&repoURL, &v.ScanID, &v.ComponentName, &v.ComponentVersion, &v.CVEID, &v.Severity, &v.Summary, &v.FixedVersion); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse vulnerability row"})
		}
		// Parse owner/repo from URL
		v.ProjectName = repoURL
		if repoURL != "" {
			parts := strings.Split(strings.TrimSuffix(repoURL, "/"), "/")
			if len(parts) >= 2 {
				v.ProjectName = parts[len(parts)-2] + "/" + parts[len(parts)-1]
			}
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

// HandleListGitHubRepos handles GET /api/github/repos
func (h *ScanHandler) HandleListGitHubRepos(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Fetch GitHub OAuth token from Supabase auth.identities
	var providerToken sql.NullString
	err := h.db.QueryRowContext(c.Context(), `
		SELECT identity_data->>'provider_token' 
		FROM auth.identities 
		WHERE user_id = $1 AND provider = 'github'
		LIMIT 1
	`, userID).Scan(&providerToken)

	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "GitHub not connected"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch GitHub token"})
	}

	githubToken := providerToken.String
	ghClient := github.NewClient(githubToken)

	fmt.Printf("Fetching repositories for user %s...\n", userID)
	repos, err := ghClient.ListUserRepositories(c.Context())
	if err != nil {
		fmt.Printf("Error fetching GitHub repos: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch repositories: " + err.Error()})
	}
	fmt.Printf("Successfully fetched %d repositories for user %s\n", len(repos), userID)

	return c.JSON(fiber.Map{
		"repositories": repos,
	})
}
