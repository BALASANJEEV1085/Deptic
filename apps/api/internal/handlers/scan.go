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

	"github.com/deptic-io/api/internal/compliance"
	"github.com/deptic-io/api/internal/db"
	"github.com/deptic-io/api/internal/github"
	"github.com/deptic-io/api/internal/notify"
	"github.com/deptic-io/api/internal/plans"
	"github.com/deptic-io/api/internal/scanner"
	"github.com/deptic-io/api/internal/vuln"
	"github.com/deptic-io/api/internal/workspace"
)

// JWTAuthMiddleware validates Supabase JWTs using the JWKS endpoint (supports ES256)
func JWTAuthMiddleware(database *sql.DB, redisClient *redis.Client) fiber.Handler {
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
			// Fallback for HS256 tokens (like service keys or locally generated demo tokens) which lack a 'kid'
			if parseErr != nil && strings.Contains(parseErr.Error(), "kid") {
				secret := os.Getenv("SUPABASE_JWT_SECRET")
				token, parseErr = jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
					if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
						return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
					}
					return []byte(secret), nil
				})
			}
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

		// Demo fallback: if using the dummy ID, map it to the first available real user
		if sub == "11111111-1111-1111-1111-111111111111" {
			var realID string
			// Try to get a real user ID to satisfy foreign key constraints
			_ = database.QueryRowContext(c.Context(), "SELECT id FROM auth.users LIMIT 1").Scan(&realID)
			if realID != "" {
				sub = realID
			}
		}

		c.Locals("user_id", sub)

		// Auto-ensure personal workspace
		email, _ := claims["email"].(string)
		if err := EnsurePersonalWorkspace(c.Context(), database, sub, email); err != nil {
			fmt.Printf("EnsurePersonalWorkspace error: %v\n", err)
		}

		// Detect new login session
		sessionID, _ := claims["session_id"].(string)
		if sessionID != "" && redisClient != nil {
			isNew := redisClient.SetNX(c.Context(), "session_notified:"+sessionID, "1", 720*time.Hour).Val()
			if isNew {
				deviceName := "Browser"
				userAgent := c.Get("User-Agent")
				if strings.Contains(strings.ToLower(userAgent), "mobile") {
					deviceName = "Mobile"
				}
				go notify.SendPushToUser(context.Background(), database, sub, notify.PushPayload{
					Title: "New login to Deptic",
					Body:  "Signed in from " + deviceName + " · " + time.Now().Format("Jan 2, 3:04 PM"),
					URL:   "/dashboard/settings",
					Tag:   "login-" + sessionID,
					Type:  "new_login",
					RequireInteraction: false,
				})
			}
		}

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
	ih := NewIntegrationsHandler(database)
	wh := NewWorkspaceHandler(database)
	webh := NewWebhookHandler(database, redisClient, h)
	pushh := NewPushHandler(database)
	obh := NewOnboardingHandler(database)

	// Public routes (no auth)
	api.Post("/webhooks/github", webh.HandleGitHubWebhook)
	api.Get("/share/:token", h.HandleViewShareLink)
	api.Get("/invite/:token", wh.HandleGetInvitationPublic)
	api.Get("/notifications/unread", pushh.GetUnreadOffline)
	api.Post("/notifications/:id/clicked", pushh.MarkClicked)
	api.Post("/donate", HandleDonate)
	api.Post("/payment/webhook", h.RazorpayWebhook)
	api.Post("/cookies/consent", h.SaveCookieConsent)

	// CLI scan — authenticated by X-API-Key header only, NO JWT
	api.Post("/scan-local", h.ScanLocal)

	// Apply JWT middleware to subsequent routes
	api.Use(JWTAuthMiddleware(database, redisClient))

	// Invitation accept route (JWT-protected)
	api.Post("/invite/:token/accept", wh.HandleAcceptInvitation)
	api.Post("/invite/:token/decline", wh.HandleDeclineInvitation)

	// Register Workspace routes
	wh.RegisterRoutes(api)
	
	// Register Webhook routes
	webh.RegisterRoutes(api)

	// Register Push notification routes
	api.Post("/push/subscribe", pushh.Subscribe)
	api.Post("/push/unsubscribe", pushh.Unsubscribe)
	api.Get("/push/status", pushh.GetStatus)
	api.Get("/notifications", pushh.GetNotifications)
	api.Post("/notifications/:id/read", pushh.MarkRead)
	api.Get("/notifications/preferences", pushh.GetPreferences)
	api.Put("/notifications/preferences", pushh.UpdatePreferences)

	// API Key management routes
	api.Post("/keys", h.HandleCreateKey)
	api.Get("/keys", h.HandleListKeys)
	api.Delete("/keys/:keyID", h.HandleDeleteKey)

	ih.RegisterRoutes(api)
	obh.RegisterRoutes(api)

	// Payment routes
	api.Post("/payment/create-order", h.CreatePaymentOrder)
	api.Post("/payment/verify", h.VerifyPayment)
	api.Get("/payment/status", h.GetPaymentStatus)

	api.Post("/scans", h.HandleCreateScan)
	api.Get("/scans", h.HandleListAllScans)
	api.Get("/scans/audit/:auditID", h.HandleResolveAuditID)
	api.Get("/scans/:scanID", h.HandleGetScan)
	api.Get("/scans/:scanID/vulnerabilities", h.HandleGetScanVulnerabilities)
	api.Post("/scans/:scanID/fix-pr", h.HandleCreateFixPR)
	api.Get("/scans/:scanID/fix-pr/status", h.HandleGetFixPRStatus)
	api.Get("/scans/:scanID/fix-prs", h.HandleGetFixPRs)
	api.Post("/scans/:scanID/deptic", h.HandleGenerateDEPTIC)
	api.Get("/vulnerabilities", h.HandleGetAllVulnerabilities)
	api.Get("/projects", h.HandleListProjects)
	api.Get("/projects/:projectID/scans", h.HandleListScans)
	api.Get("/github/repos", h.HandleListGitHubRepos)
	api.Post("/github/save-token", h.HandleSaveGitHubToken)
	api.Get("/dashboard/stats", h.HandleGetDashboardStats)
	api.Get("/deptics/:depticID/download", h.HandleDownloadDEPTIC)
	api.Post("/deptics/:depticID/share", h.HandleCreateShareLink)
	api.Get("/deptics/:depticID/shares", h.HandleListShareLinks)
	api.Get("/scans/:scanID/shares", h.HandleListScanShareLinks)
	api.Get("/scans/:scanID/compliance", h.GetCompliance)
	api.Get("/scans/:scanID/report/pdf", h.DownloadPDFReport)
	api.Delete("/deptics/:depticID/shares/:token", h.HandleRevokeShareLink)
	api.Get("/share/:token/download", h.HandleDownloadShareLink)

	// Account deletion
	api.Delete("/account", h.HandleDeleteAccount)
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

	exceeded, _, limit, _ := plans.CheckDailyScanLimit(c.Context(), h.db, userID)
	if exceeded {
		return c.Status(429).JSON(fiber.Map{
			"error":       "Daily scan limit reached",
			"limit":       limit,
			"remaining":   0,
			"plan":        plans.GetUserPlan(c.Context(), h.db, userID),
			"upgrade_url": "/pricing",
		})
	}

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

	githubToken := ResolveGitHubToken(c, h.db, userID)

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermCreateScan)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	// Create or fetch the workspace or user default project to satisfy the FK constraint
	var projectID string
	if wsID != "" {
		err = h.db.QueryRowContext(c.Context(), "SELECT id FROM projects WHERE workspace_id = $1 LIMIT 1", wsID).Scan(&projectID)
		if err != nil {
			// Create default project for workspace if missing
			err = h.db.QueryRowContext(c.Context(), `
				INSERT INTO projects (id, user_id, name, workspace_id, created_at)
				VALUES (gen_random_uuid(), $1, 'Default Project', $2, now())
				RETURNING id
			`, userID, wsID).Scan(&projectID)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to resolve workspace project: " + err.Error()})
			}
		}
	} else {
		projectID, err = db.CreateOrGetDefaultProject(c.Context(), h.db, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create project: " + err.Error()})
		}
	}

	// Create scan record in database
	scanID, err := db.CreateScan(c.Context(), h.db, &db.CreateScanParams{
		ProjectID: projectID,
		RepoURL:   req.GithubURL,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create scan record"})
	}

	// Store workspace_id on scans if workspace is active
	if wsID != "" {
		_, _ = h.db.ExecContext(c.Context(), "UPDATE scans SET workspace_id = $1 WHERE id = $2", wsID, scanID)
	}

	// Launch scan in background
	go h.RunFullScan(scanID, userID, githubToken, owner, repo, req.GithubURL)

	plans.IncrementScanCount(c.Context(), h.db, userID)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"scan_id": scanID,
		"status":  "running",
	})
}

func (h *ScanHandler) RunFullScan(scanID, userID, githubToken, owner, repo, repoURL string) {
	// Use a disconnected background context because Fiber context gets cancelled when response is sent
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	ghClient := github.NewClient(githubToken)

	// Step 1: Detect
	_ = db.UpdateScanStatus(ctx, h.db, scanID, "detecting", "")

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

	// Step 2: Scan (Resolve Dependencies)
	_ = db.UpdateScanStatus(ctx, h.db, scanID, "scanning", "")

	var allPackages []scanner.Package
	var mu sync.Mutex
	var wg sync.WaitGroup
	manifestSem := make(chan struct{}, 2) // Limit to 2 concurrent manifests

	// Scan each manifest
	for _, m := range allManifests {
		m := m
		wg.Add(1)
		go func() {
			defer wg.Done()
			manifestSem <- struct{}{}
			defer func() { <-manifestSem }()
			
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
			case "go":
				pkgs, scanErr = scanner.ScanGoMod(ctx, h.rdb, m.Data)
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
	_ = db.UpdateScanStatus(ctx, h.db, scanID, "analyzing", ecosystemStr)
	vulns, err := vuln.MatchVulnerabilities(ctx, h.db, scanID)
	var criticalCves, highCves, mediumCves, lowCves int
	if err == nil && len(vulns) > 0 {
		if err := vuln.SaveComponentVulns(ctx, h.db, vulns); err != nil {
			fmt.Printf("Failed to save vulnerabilities: %v\n", err)
		}
		for _, v := range vulns {
			switch v.Severity {
			case "CRITICAL":
				criticalCves++
			case "HIGH":
				highCves++
			case "MEDIUM":
				mediumCves++
			case "LOW":
				lowCves++
			}
		}

		if criticalCves > 0 {
			go notify.SendPushToUser(context.Background(), h.db, userID, notify.PushPayload{
				Title: "🚨 Critical CVE in " + repo,
				Body:  fmt.Sprintf("%d critical vulnerabilities detected · Immediate action required", criticalCves),
				URL:   "/dashboard/scans/" + scanID + "?tab=vulnerabilities",
				Tag:   "critical-cve-" + scanID,
				Type:  "critical_cve",
				RequireInteraction: true,
				Vibrate: []int{300, 100, 300, 100, 300},
				Actions: []notify.PushAction{
					{Action: "view_scan", Title: "View CVEs"},
				},
			})
		} else if highCves > 0 {
			go notify.SendPushToUser(context.Background(), h.db, userID, notify.PushPayload{
				Title: "⚠ High severity CVEs in " + repo,
				Body:  fmt.Sprintf("%d high severity vulnerabilities · Review and patch recommended", highCves),
				URL:   "/dashboard/scans/" + scanID + "?tab=vulnerabilities",
				Tag:   "high-cve-" + scanID,
				Type:  "high_cve",
			})
		}
	}

	// 5. NTIA Compliance Check
	_ = db.UpdateScanStatus(ctx, h.db, scanID, "reporting", ecosystemStr)
	depticMeta := compliance.DEPTICMeta{
		AuthorName:  "DEPTIC.io",
		AuthorTool:  "deptic-io-scanner v1.0.0",
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
	ntiaResult := compliance.CheckNTIA(checkPackages, depticMeta)
	euCompliant := compliance.CheckEUCRA(ntiaResult)

	detailBytes, _ := json.Marshal(ntiaResult)
	if err := db.UpdateScanCompliance(ctx, h.db, scanID, ntiaResult.Score, ntiaResult.Compliant, euCompliant, detailBytes, repoURL, ecosystemStr); err != nil {
		fmt.Printf("Warning: failed to save scan compliance: %v\n", err)
	}

	// 6. Finalize scan status
	_ = db.UpdateScanStatus(ctx, h.db, scanID, "done", ecosystemStr)
	fmt.Printf("Scan done: %d components, ecosystems=%s\n", len(allPackages), ecosystemStr)

	go notify.SendPushToUser(context.Background(), h.db, userID, notify.PushPayload{
		Title: "Scan complete — " + repo,
		Body:  fmt.Sprintf("%d components · %d threats · NTIA %d/100", len(allPackages), len(vulns), ntiaResult.Score),
		URL:   "/dashboard/scans/" + scanID,
		Tag:   "scan-" + scanID,
		Type:  "scan_complete",
		Actions: []notify.PushAction{
			{Action: "view_scan", Title: "View Report"},
			{Action: "dismiss", Title: "Dismiss"},
		},
	})

	// 7. Send Notifications
	var slackConfigJSON string
	var slackEnabled bool
	err = h.db.QueryRowContext(ctx, "SELECT config, enabled FROM integrations WHERE user_id = $1 AND type = 'slack'", userID).Scan(&slackConfigJSON, &slackEnabled)
	if err == nil && slackEnabled && len(vulns) > 0 {
		var cfg notify.SlackConfig
		if err := json.Unmarshal([]byte(slackConfigJSON), &cfg); err == nil && cfg.WebhookURL != "" {
			
			// Sort vulns by severity before displaying
			sortedVulns := make([]vuln.ComponentVuln, len(vulns))
			copy(sortedVulns, vulns)
			severityRank := map[string]int{"CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4}
			for i := 0; i < len(sortedVulns)-1; i++ {
				for j := i + 1; j < len(sortedVulns); j++ {
					r1, ok1 := severityRank[sortedVulns[i].Severity]
					r2, ok2 := severityRank[sortedVulns[j].Severity]
					if !ok1 { r1 = 5 }
					if !ok2 { r2 = 5 }
					if r2 < r1 {
						sortedVulns[i], sortedVulns[j] = sortedVulns[j], sortedVulns[i]
					}
				}
			}

			var threatDetails strings.Builder
			threatDetails.WriteString("*Top Threats Found:*\n")
			for i, v := range sortedVulns {
				if i >= 5 {
					threatDetails.WriteString(fmt.Sprintf("\n...and %d more\n", len(sortedVulns)-5))
					break
				}
				var compName, compVersion string
				h.db.QueryRowContext(ctx, "SELECT name, version FROM components WHERE id = $1", v.ComponentID).Scan(&compName, &compVersion)
				threatDetails.WriteString(fmt.Sprintf("• `%s@%s` - %s (%s)\n", compName, compVersion, v.CVEID, v.Severity))
			}

			msg := notify.SlackMessage{
				Blocks: []interface{}{
					map[string]interface{}{"type": "header", "text": map[string]interface{}{"type": "plain_text", "text": "🚨 DEPTIC.io Security Alert"}},
					map[string]interface{}{"type": "section", "fields": []interface{}{
						map[string]interface{}{"type": "mrkdwn", "text": "*Repository:*\n" + repo},
						map[string]interface{}{"type": "mrkdwn", "text": fmt.Sprintf("*Audit ID:*\n`%s`", scanID)},
					}},
					map[string]interface{}{"type": "section", "fields": []interface{}{
						map[string]interface{}{"type": "mrkdwn", "text": fmt.Sprintf("*Critical:* %d", criticalCves)},
						map[string]interface{}{"type": "mrkdwn", "text": fmt.Sprintf("*High:* %d", highCves)},
						map[string]interface{}{"type": "mrkdwn", "text": fmt.Sprintf("*Medium:* %d", mediumCves)},
						map[string]interface{}{"type": "mrkdwn", "text": fmt.Sprintf("*NTIA Score:* %d/100", ntiaResult.Score)},
					}},
					map[string]interface{}{"type": "section", "text": map[string]interface{}{"type": "mrkdwn", "text": threatDetails.String()}},
					map[string]interface{}{"type": "actions", "elements": []interface{}{
						map[string]interface{}{"type": "button", "text": map[string]interface{}{"type": "plain_text", "text": "View Report"}, "url": "https://deptic.io/dashboard/scans/" + scanID, "style": "primary"},
						map[string]interface{}{"type": "button", "text": map[string]interface{}{"type": "plain_text", "text": "Fix with PR"}, "url": "https://deptic.io/dashboard/scans/" + scanID},
					}},
				},
			}
			notify.SendSlackNotification(ctx, cfg.WebhookURL, msg)
		}
	}

	var jiraConfigJSON string
	var jiraEnabled bool
	err = h.db.QueryRowContext(ctx, "SELECT config, enabled FROM integrations WHERE user_id = $1 AND type = 'jira'", userID).Scan(&jiraConfigJSON, &jiraEnabled)
	if err == nil && jiraEnabled && len(vulns) > 0 {
		var cfg notify.JiraConfig
		if err := json.Unmarshal([]byte(jiraConfigJSON), &cfg); err == nil && cfg.BaseURL != "" {
			// Group by package
			pkgVulns := make(map[string][]vuln.ComponentVuln)
			for _, v := range vulns {
				if v.Severity == "CRITICAL" || v.Severity == "HIGH" {
					// Actually we need the component name
					var compName string
					h.db.QueryRowContext(ctx, "SELECT name FROM components WHERE id = $1", v.ComponentID).Scan(&compName)
					if compName != "" {
						pkgVulns[compName] = append(pkgVulns[compName], v)
					}
				}
			}

			for pkgName, pkgVs := range pkgVulns {
				highestSev := "HIGH"
				for _, v := range pkgVs {
					if v.Severity == "CRITICAL" {
						highestSev = "CRITICAL"
					}
				}

				summary := fmt.Sprintf("[DEPTIC.io] %s CVE in %s — %s in %s", highestSev, repo, pkgVs[0].CVEID, pkgName)
				content := fmt.Sprintf("DEPTIC.io detected vulnerabilities in %s (Audit ID: %s):\n", pkgName, scanID)
				for _, v := range pkgVs {
					content += fmt.Sprintf("- %s (%s): %s\n", v.CVEID, v.Severity, v.Summary)
				}

				issue := notify.JiraIssue{}
				issue.Fields.Project = map[string]string{"key": cfg.ProjectKey}
				issue.Fields.Summary = summary
				issue.Fields.IssueType = map[string]string{"name": "Task"}
				
				issue.Fields.Labels = []string{"security", "deptic-io", "cve", strings.ToLower(highestSev)}
				issue.Fields.Description = map[string]any{
					"type": "doc", "version": 1,
					"content": []map[string]any{
						{
							"type": "paragraph",
							"content": []map[string]any{
								{"type": "text", "text": content},
							},
						},
					},
				}

				key, err := notify.CreateJiraTicket(ctx, cfg, issue)
				if err != nil {
					fmt.Printf("Failed to create Jira ticket for %s: %v\n", pkgName, err)
				} else if key != "" {
					fmt.Printf("Successfully created Jira ticket %s\n", key)
					url := strings.TrimRight(cfg.BaseURL, "/") + "/browse/" + key
					for _, v := range pkgVs {
						h.db.ExecContext(ctx, "UPDATE component_vulnerabilities SET jira_ticket_key = $1, jira_ticket_url = $2 WHERE cve_id = $3 AND component_id = $4", key, url, v.CVEID, v.ComponentID)
					}
				}
			}
		}
	}
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

	var isOwner bool
	var hasGitHubPushAccess bool
	userID, ok := c.Locals("user_id").(string)
	if ok && userID != "" {
		h.db.QueryRowContext(c.Context(), "SELECT EXISTS(SELECT 1 FROM projects WHERE id=$1 AND user_id=$2)", scan.ProjectID, userID).Scan(&isOwner)

		// Check if user has push access to the scanned GitHub repo.
		if scan.RepoURL != "" && strings.Contains(scan.RepoURL, "github.com") {
			githubToken := ResolveGitHubToken(c, h.db, userID)

			if githubToken != "" {
				owner, repo, parseErr := github.ParseRepoURL(scan.RepoURL)
				if parseErr == nil {
					ghClient := github.NewClient(githubToken)
					pushAccess, accessErr := ghClient.CheckRepoPushAccess(c.Context(), owner, repo)
					if accessErr == nil {
						hasGitHubPushAccess = pushAccess
					}
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"scan":                   scan,
		"components":             components,
		"total":                  len(components),
		"ecosystems":             ecosystemList,
		"ecosystem_breakdown":    breakdown,
		"manifest_files":         manifestFiles,
		"is_owner":               isOwner,
		"has_github_push_access": hasGitHubPushAccess,
	})
}

// HandleResolveAuditID handles GET /api/scans/audit/:auditID
func (h *ScanHandler) HandleResolveAuditID(c *fiber.Ctx) error {
	auditID := c.Params("auditID")
	
	var fullID string
	err := h.db.QueryRowContext(c.Context(), `
		SELECT id FROM scans WHERE id::text LIKE $1 || '%' LIMIT 1
	`, auditID).Scan(&fullID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Scan not found with this Audit ID"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error resolving Audit ID"})
	}
	
	return c.JSON(fiber.Map{"scan_id": fullID})
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

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermViewScan)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	var targetFilter string
	var targetID string
	if wsID != "" {
		targetFilter = "p.workspace_id"
		targetID = wsID
	} else {
		targetFilter = "p.user_id"
		targetID = userID
	}

	var totalProjects, totalScans, totalComponents int
	var criticalCves, highCves, mediumCves, lowCves int

	h.db.QueryRowContext(c.Context(), fmt.Sprintf("SELECT count(*) FROM projects p WHERE %s = $1", targetFilter), targetID).Scan(&totalProjects)
	
	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT count(*) FROM scans s JOIN projects p ON s.project_id = p.id WHERE %s = $1
	`, targetFilter), targetID).Scan(&totalScans)

	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT count(*) FROM components c JOIN scans s ON c.scan_id = s.id JOIN projects p ON s.project_id = p.id WHERE %s = $1
	`, targetFilter), targetID).Scan(&totalComponents)

	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE %s = $1 AND cv.severity = 'CRITICAL'
	`, targetFilter), targetID).Scan(&criticalCves)

	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE %s = $1 AND cv.severity = 'HIGH'
	`, targetFilter), targetID).Scan(&highCves)

	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE %s = $1 AND cv.severity = 'MEDIUM'
	`, targetFilter), targetID).Scan(&mediumCves)

	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT count(*) FROM component_vulnerabilities cv
		JOIN components c ON cv.component_id = c.id
		JOIN scans s ON c.scan_id = s.id
		JOIN projects p ON s.project_id = p.id
		WHERE %s = $1 AND cv.severity = 'LOW'
	`, targetFilter), targetID).Scan(&lowCves)

	var cleanProjects int
	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT count(DISTINCT p.id)
		FROM projects p
		WHERE %s = $1 AND p.id NOT IN (
			SELECT DISTINCT s.project_id
			FROM scans s
			JOIN components c ON s.id = c.scan_id
			JOIN component_vulnerabilities cv ON c.id = cv.component_id
			WHERE cv.severity IN ('CRITICAL', 'HIGH')
		)
	`, targetFilter), targetID).Scan(&cleanProjects)

	var compliant, nonCompliant int
	h.db.QueryRowContext(c.Context(), fmt.Sprintf(`
		SELECT 
			COUNT(*) FILTER (WHERE ntia_compliant = true),
			COUNT(*) FILTER (WHERE ntia_compliant = false OR ntia_compliant IS NULL)
		FROM scans s
		JOIN projects p ON s.project_id = p.id
		WHERE %s = $1
		  AND s.status = 'done'
	`, targetFilter), targetID).Scan(&compliant, &nonCompliant)

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
	rows, err := h.db.QueryContext(c.Context(), fmt.Sprintf(`
		SELECT 
			s.id, s.status, s.created_at, COALESCE(s.repo_url, ''), COALESCE(s.ecosystem, 'unknown'),
			COALESCE(s.compliance_score, 0),
			(SELECT COUNT(*) FROM components WHERE scan_id = s.id) as component_count,
			(SELECT COUNT(*) FROM component_vulnerabilities cv JOIN components c ON cv.component_id = c.id WHERE c.scan_id = s.id AND cv.severity = 'CRITICAL') as critical_cves
		FROM scans s
		JOIN projects p ON p.id = s.project_id
		WHERE %s = $1
		ORDER BY s.created_at DESC
		LIMIT 15
	`, targetFilter), targetID)
	
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

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermViewScan)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	var rows *sql.Rows
	if wsID != "" {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT s.id, s.project_id, s.status, s.created_at,
			       COALESCE(s.repo_url, ''), COALESCE(s.ecosystem, ''),
			       COALESCE(s.compliance_score, 0)
			FROM scans s
			JOIN projects p ON s.project_id = p.id
			WHERE p.workspace_id = $1
			ORDER BY s.created_at DESC
		`, wsID)
	} else {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT s.id, s.project_id, s.status, s.created_at,
			       COALESCE(s.repo_url, ''), COALESCE(s.ecosystem, ''),
			       COALESCE(s.compliance_score, 0)
			FROM scans s
			JOIN projects p ON s.project_id = p.id
			WHERE p.user_id = $1
			ORDER BY s.created_at DESC
		`, userID)
	}

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

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermViewScan)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	var rows *sql.Rows
	if wsID != "" {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT DISTINCT ON (s.repo_url)
				s.id, s.repo_url, COALESCE(s.ecosystem,''), s.status, s.created_at,
				COALESCE(s.compliance_score,0)
			FROM scans s
			JOIN projects p ON s.project_id = p.id
			WHERE p.workspace_id = $1 AND s.repo_url IS NOT NULL AND s.repo_url != ''
			ORDER BY s.repo_url, s.created_at DESC
		`, wsID)
	} else {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT DISTINCT ON (s.repo_url)
				s.id, s.repo_url, COALESCE(s.ecosystem,''), s.status, s.created_at,
				COALESCE(s.compliance_score,0)
			FROM scans s
			JOIN projects p ON s.project_id = p.id
			WHERE p.user_id = $1 AND s.repo_url IS NOT NULL AND s.repo_url != ''
			ORDER BY s.repo_url, s.created_at DESC
		`, userID)
	}

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
	Vulnerabilities []VulnerabilityResponse `json:"vulnerabilities,omitempty"`
	Grouped         []GroupedVulnResponse   `json:"grouped,omitempty"`
}

type GroupedVulnResponse struct {
	ComponentName    string   `json:"component_name"`
	ComponentVersion string   `json:"component_version"`
	Ecosystem        string   `json:"ecosystem"`
	HighestSeverity  string   `json:"highest_severity"`
	CVECount         int      `json:"cve_count"`
	CVEs             []string `json:"cves"`
	CVEsDetail       []map[string]string `json:"cves_detail"`
	CleanVersion     string   `json:"clean_version"`
}

// HandleGetScanVulnerabilities handles GET /api/scans/:scanID/vulnerabilities
func (h *ScanHandler) HandleGetScanVulnerabilities(c *fiber.Ctx) error {
	scanID := c.Params("scanID")

	critical, high, medium, low, err := vuln.GetScanVulnSummary(c.Context(), h.db, scanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get vulnerability summary"})
	}

	grouped := c.Query("grouped") == "true"

	query := `
		SELECT c.name, c.version, c.ecosystem, cv.cve_id, cv.severity, cv.summary, cv.fixed_version
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
		var eco string
		if err := rows.Scan(&v.ComponentName, &v.ComponentVersion, &eco, &v.CVEID, &v.Severity, &v.Summary, &v.FixedVersion); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse vulnerability row"})
		}
		// Temporarily store ecosystem in ProjectName or somewhere just to construct grouped
		// or just use a local struct. We will group it manually.
		v.ProjectName = eco 
		vulns = append(vulns, v)
	}

	if vulns == nil {
		vulns = []VulnerabilityResponse{}
	}

	res := ScanVulnResponse{}
	res.Summary.Critical = critical
	res.Summary.High = high
	res.Summary.Medium = medium
	res.Summary.Low = low

	if grouped {
		groupMap := make(map[string]*GroupedVulnResponse)
		var groupKeys []string
		
		sevRank := map[string]int{"CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4}

		for _, v := range vulns {
			key := v.ComponentName + "@" + v.ComponentVersion
			if _, ok := groupMap[key]; !ok {
				groupMap[key] = &GroupedVulnResponse{
					ComponentName:    v.ComponentName,
					ComponentVersion: v.ComponentVersion,
					Ecosystem:        v.ProjectName,
					HighestSeverity:  v.Severity,
					CVEs:             []string{},
					CVEsDetail:       []map[string]string{},
				}
				groupKeys = append(groupKeys, key)
			}
			
			g := groupMap[key]
			
			// Update highest severity
			curRank := sevRank[v.Severity]
			if curRank == 0 { curRank = 5 }
			highestRank := sevRank[g.HighestSeverity]
			if highestRank == 0 { highestRank = 5 }
			
			if curRank < highestRank {
				g.HighestSeverity = v.Severity
			}
			
			g.CVEs = append(g.CVEs, v.CVEID)
			g.CVEsDetail = append(g.CVEsDetail, map[string]string{
				"id": v.CVEID,
				"severity": v.Severity,
				"summary": v.Summary,
			})
			g.CVECount++
			
			// We just keep one fixed version if it's there
			if v.FixedVersion != "" && g.CleanVersion == "" {
				g.CleanVersion = v.FixedVersion
			}
		}
		
		for _, k := range groupKeys {
			res.Grouped = append(res.Grouped, *groupMap[k])
		}
		if res.Grouped == nil {
			res.Grouped = []GroupedVulnResponse{}
		}
	} else {
		// Clean up ProjectName abuse
		for i := range vulns {
			vulns[i].ProjectName = ""
		}
		res.Vulnerabilities = vulns
	}

	return c.JSON(res)
}

// HandleGetAllVulnerabilities handles GET /api/vulnerabilities
func (h *ScanHandler) HandleGetAllVulnerabilities(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermViewScan)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	var rows *sql.Rows
	if wsID != "" {
		query := `
			SELECT COALESCE(s.repo_url,''), s.id, c.name, c.version, cv.cve_id, cv.severity, cv.summary, cv.fixed_version
			FROM component_vulnerabilities cv
			JOIN components c ON c.id = cv.component_id
			JOIN scans s ON c.scan_id = s.id
			JOIN projects p ON s.project_id = p.id
			WHERE p.workspace_id = $1
			ORDER BY
				CASE cv.severity
					WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5
				END ASC,
				s.created_at DESC
			LIMIT 500
		`
		rows, err = h.db.QueryContext(c.Context(), query, wsID)
	} else {
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
		rows, err = h.db.QueryContext(c.Context(), query, userID)
	}

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

	githubToken := ResolveGitHubToken(c, h.db, userID)

	if githubToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "GitHub not connected"})
	}

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

// ResolveGitHubToken attempts to retrieve a valid GitHub OAuth token for the user
func ResolveGitHubToken(c *fiber.Ctx, db *sql.DB, userID string) string {
	// 1. Prefer live token passed from frontend session
	var githubToken string
	if c != nil {
		githubToken = c.Get("X-GitHub-Token")
	}
	if githubToken != "" {
		return githubToken
	}

	var ctx context.Context
	if c != nil {
		ctx = c.Context()
	} else {
		ctx = context.Background()
	}

	// 2. Check our persisted tokens table
	var storedToken string
	err := db.QueryRowContext(ctx, `SELECT token FROM user_github_tokens WHERE user_id = $1`, userID).Scan(&storedToken)
	if err == nil && storedToken != "" {
		fmt.Printf("[DEBUG] ResolveGitHubToken: Found token in user_github_tokens for user %s\n", userID)
		return storedToken
	} else {
		fmt.Printf("[DEBUG] ResolveGitHubToken: No token in user_github_tokens for user %s (err: %v)\n", userID, err)
	}

	// 3. Fallback: fetch from Supabase auth.identities (legacy)
	var providerToken sql.NullString
	_ = db.QueryRowContext(ctx, `
		SELECT identity_data->>'provider_token' 
		FROM auth.identities 
		WHERE user_id = $1 AND provider = 'github'
		LIMIT 1
	`, userID).Scan(&providerToken)
	
	if providerToken.String != "" {
		fmt.Printf("[DEBUG] ResolveGitHubToken: Found legacy token in auth.identities for user %s\n", userID)
		return providerToken.String
	}

	// 4. Final Fallback: environment variable if the user has connected GitHub
	var provider string
	_ = db.QueryRowContext(ctx, `
		SELECT provider FROM auth.identities 
		WHERE user_id = $1 AND provider = 'github' LIMIT 1
	`, userID).Scan(&provider)

	if provider == "github" {
		return os.Getenv("GITHUB_TOKEN")
	}

	return ""
}

// HandleSaveGitHubToken handles POST /api/github/save-token
func (h *ScanHandler) HandleSaveGitHubToken(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	
	var req struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token is required"})
	}

	_, err := h.db.ExecContext(c.Context(), `
		INSERT INTO user_github_tokens (user_id, token, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, updated_at = NOW()
	`, userID, req.Token)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save token"})
	}

	return c.JSON(fiber.Map{"success": true})
}

