package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"github.com/deptic-io/api/internal/db"
	"github.com/deptic-io/api/internal/github"
	"github.com/deptic-io/api/internal/plans"
)

type WebhookHandler struct {
	db          *sql.DB
	rdb         *redis.Client
	scanHandler *ScanHandler
}

func NewWebhookHandler(database *sql.DB, rdb *redis.Client, sh *ScanHandler) *WebhookHandler {
	return &WebhookHandler{db: database, rdb: rdb, scanHandler: sh}
}

func (wh *WebhookHandler) RegisterRoutes(api fiber.Router) {
	api.Post("/webhooks/register", wh.HandleRegisterWebhook)
	api.Delete("/webhooks/:webhookID", wh.HandleDeleteWebhook)
	api.Put("/webhooks/:webhookID/toggle", wh.HandleToggleWebhook)
	api.Get("/webhooks", wh.HandleListWebhooks)
	api.Get("/webhooks/:webhookID/events", wh.HandleListWebhookEvents)
}

func verifyGitHubSignature(payload []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

type GitHubPushEvent struct {
	Ref        string `json:"ref"`
	After      string `json:"after"`
	Repository struct {
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
	} `json:"repository"`
	Pusher struct {
		Name string `json:"name"`
	} `json:"pusher"`
	HeadCommit struct {
		Message  string   `json:"message"`
		Added    []string `json:"added"`
		Modified []string `json:"modified"`
	} `json:"head_commit"`
	Commits []struct {
		Message  string   `json:"message"`
		Added    []string `json:"added"`
		Modified []string `json:"modified"`
	} `json:"commits"`
}

func (wh *WebhookHandler) HandleGitHubWebhook(c *fiber.Ctx) error {
	payload := c.Body()
	signature := c.Get("X-Hub-Signature-256")
	if signature == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing signature"})
	}

	// Handle ping events (sent when webhook is first created)
	ghEvent := c.Get("X-GitHub-Event")
	if ghEvent == "ping" {
		fmt.Println("Webhook: received ping event — webhook is active!")
		return c.JSON(fiber.Map{"status": "pong"})
	}
	if ghEvent != "" && ghEvent != "push" {
		fmt.Printf("Webhook: ignoring event type: %s\n", ghEvent)
		return c.SendStatus(fiber.StatusOK)
	}

	var event GitHubPushEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	repoFullName := event.Repository.FullName
	parts := strings.Split(repoFullName, "/")
	if len(parts) != 2 {
		return c.SendStatus(fiber.StatusOK) // Skip
	}
	owner, repo := parts[0], parts[1]

	reg, err := db.GetWebhookRegistrationByRepo(c.Context(), wh.db, owner, repo)
	if err != nil {
		fmt.Printf("Webhook Error looking up registration for %s: %v\n", repoFullName, err)
		return c.SendStatus(fiber.StatusOK)
	}
	if reg == nil || !reg.Enabled {
		fmt.Printf("Webhook skipped: registration not found or disabled for %s\n", repoFullName)
		return c.SendStatus(fiber.StatusOK)
	}

	if !verifyGitHubSignature(payload, signature, reg.WebhookSecret) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid signature"})
	}

	branch := strings.TrimPrefix(event.Ref, "refs/heads/")

	// Create event record initially as processing
	eventRecord := &db.WebhookEvent{
		WebhookID: reg.ID,
		EventType: "push",
		Branch:    branch,
		CommitSHA: event.After,
		Pusher:    event.Pusher.Name,
		Status:    "processing",
		Payload:   string(payload),
	}
	eventID, err := db.CreateWebhookEvent(c.Context(), wh.db, eventRecord)
	if err != nil {
		fmt.Printf("Webhook Error creating event: %v\n", err)
		return c.SendStatus(fiber.StatusOK)
	}

	if !reg.ScanOnAllBranches && branch != reg.AutoScanBranch {
		fmt.Printf("Webhook skipped for %s: branch %s does not match auto_scan_branch %s\n", repoFullName, branch, reg.AutoScanBranch)
		db.UpdateWebhookEvent(c.Context(), wh.db, eventID, "", "skipped: branch does not match auto_scan_branch")
		return c.SendStatus(fiber.StatusOK)
	}

	// Smart trigger check
	isScanNeeded := false
	manifestFiles := []string{"package.json", "requirements.txt", "pyproject.toml", "pom.xml", "go.mod", "Cargo.toml", "Gemfile", "composer.json"}
	
	for _, commit := range append(event.Commits, event.HeadCommit) {
		if strings.Contains(commit.Message, "[deptic-scan]") {
			isScanNeeded = true
			break
		}
		checkFiles := append(commit.Added, commit.Modified...)
		for _, f := range checkFiles {
			for _, m := range manifestFiles {
				if strings.HasSuffix(f, m) {
					isScanNeeded = true
					break
				}
			}
			if isScanNeeded {
				break
			}
		}
		if isScanNeeded {
			break
		}
	}

	if !isScanNeeded {
		fmt.Printf("Webhook skipped for %s: no manifest files changed and no [deptic-scan] in commit message\n", repoFullName)
		db.UpdateWebhookEvent(c.Context(), wh.db, eventID, "", "skipped: no manifest files changed and no [deptic-scan] in commit")
		return c.SendStatus(fiber.StatusOK)
	}

	// Rate Limiting
	// Check daily scan limit
	exceeded, _, _, _ := plans.CheckDailyScanLimit(c.Context(), wh.db, reg.UserID)
	if exceeded {
		fmt.Printf("Skipping webhook scan for %s: daily limit reached\n", repoFullName)
		db.UpdateWebhookEvent(c.Context(), wh.db, eventID, "", "skipped: daily limit reached")
		return c.SendStatus(fiber.StatusOK)
	}

	// Check webhook gap
	tooSoon, _ := plans.CheckWebhookScanGap(c.Context(), wh.db, reg.ID)
	if tooSoon {
		fmt.Printf("Skipping webhook scan for %s: cooldown active\n", repoFullName)
		db.UpdateWebhookEvent(c.Context(), wh.db, eventID, "", "skipped: cooldown active")
		return c.SendStatus(fiber.StatusOK)
	}

	// Check for deduplication (same commit SHA)
	var existingScan string
	wh.db.QueryRowContext(c.Context(), "SELECT id FROM scans WHERE commit_sha = $1 AND trigger_type = 'webhook' LIMIT 1", event.After).Scan(&existingScan)
	if existingScan != "" {
		fmt.Printf("Skipping webhook scan for %s: commit already scanned\n", repoFullName)
		db.UpdateWebhookEvent(c.Context(), wh.db, eventID, "", "skipped: commit already scanned")
		return c.SendStatus(fiber.StatusOK)
	}

	// Launch async scan
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
		defer cancel()

		githubToken := ResolveGitHubToken(nil, wh.db, reg.UserID)
		if githubToken == "" {
			fmt.Printf("Webhook scan failed for %s/%s: no github token available\n", owner, repo)
			db.UpdateWebhookEvent(ctx, wh.db, eventID, "", "failed: no github token")
			return
		}
		fmt.Printf("Webhook scan starting for %s/%s (commit: %s)\n", owner, repo, event.After)

		var projectID string
		if reg.WorkspaceID != nil {
			wh.db.QueryRowContext(ctx, "SELECT id FROM projects WHERE workspace_id = $1 LIMIT 1", *reg.WorkspaceID).Scan(&projectID)
		}
		if projectID == "" {
			projectID, _ = db.CreateOrGetDefaultProject(ctx, wh.db, reg.UserID)
		}

		scanID, err := db.CreateScan(ctx, wh.db, &db.CreateScanParams{
			ProjectID:   projectID,
			RepoURL:     "https://github.com/" + owner + "/" + repo,
			TriggerType: "webhook",
			CommitSHA:   event.After,
			Branch:      branch,
		})
		if err != nil {
			db.UpdateWebhookEvent(ctx, wh.db, eventID, "", "failed to create scan")
			return
		}

		wh.scanHandler.RunFullScan(scanID, reg.UserID, githubToken, owner, repo, "https://github.com/"+owner+"/"+repo)

		db.UpdateWebhookEvent(ctx, wh.db, eventID, scanID, "completed")
		db.UpdateWebhookLastTriggered(ctx, wh.db, reg.ID, scanID)
	}()

	return c.SendStatus(fiber.StatusOK)
}

type registerWebhookRequest struct {
	RepoOwner       string `json:"repo_owner"`
	RepoName        string `json:"repo_name"`
	Branch          string `json:"branch"`
	ScanAllBranches bool   `json:"scan_all_branches"`
}

func (wh *WebhookHandler) HandleRegisterWebhook(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req registerWebhookRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	exceeded, _, limit, _ := plans.CheckWebhookLimit(c.Context(), wh.db, userID)
	if exceeded {
		return c.Status(429).JSON(fiber.Map{
			"error":       fmt.Sprintf("Webhook limit reached. Your plan allows %d active webhooks.", limit),
			"limit":       limit,
			"remaining":   0,
			"upgrade_url": "/pricing",
		})
	}

	// Fetch GitHub OAuth token
	githubToken := ResolveGitHubToken(c, wh.db, userID)
	if githubToken == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No GitHub token found. Please log in with GitHub again."})
	}

	// Generate webhook secret
	secretBytes := make([]byte, 32)
	rand.Read(secretBytes)
	webhookSecret := hex.EncodeToString(secretBytes)

	// Register on GitHub
	ghClient := github.NewClient(githubToken)
	hookID, err := ghClient.CreateWebhook(c.Context(), req.RepoOwner, req.RepoName, webhookSecret)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Webhook already exists for this repository"})
		}
		if strings.Contains(err.Error(), "404") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Repository not found or no access"})
		}
		if strings.Contains(err.Error(), "403") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Insufficient GitHub permissions. Grant repo access in GitHub settings."})
		}
		if strings.Contains(err.Error(), "401") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "GitHub token expired or missing webhook permissions. Please log out and re-authorize with GitHub to grant the admin:repo_hook scope."})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Save to DB
	reg := &db.WebhookRegistration{
		UserID:            userID,
		RepoOwner:         req.RepoOwner,
		RepoName:          req.RepoName,
		GithubHookID:      hookID,
		WebhookSecret:     webhookSecret,
		AutoScanBranch:    req.Branch,
		ScanOnAllBranches: req.ScanAllBranches,
	}
	id, err := db.CreateWebhookRegistration(c.Context(), wh.db, reg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save registration"})
	}

	return c.JSON(fiber.Map{
		"webhook_id": id,
		"status":     "active",
		"repo":       req.RepoOwner + "/" + req.RepoName,
		"branch":     req.Branch,
	})
}

func (wh *WebhookHandler) HandleDeleteWebhook(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	webhookID := c.Params("webhookID")

	reg, err := db.GetWebhookRegistration(c.Context(), wh.db, webhookID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Webhook not found"})
	}

	githubToken := ResolveGitHubToken(c, wh.db, userID)
	if githubToken != "" {
		ghClient := github.NewClient(githubToken)
		_ = ghClient.DeleteWebhook(c.Context(), reg.RepoOwner, reg.RepoName, reg.GithubHookID)
	}

	if err := db.DeleteWebhookRegistration(c.Context(), wh.db, webhookID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete from DB"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (wh *WebhookHandler) HandleToggleWebhook(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	webhookID := c.Params("webhookID")

	var req struct {
		Active bool `json:"active"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	reg, err := db.GetWebhookRegistration(c.Context(), wh.db, webhookID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Webhook not found"})
	}

	githubToken := ResolveGitHubToken(c, wh.db, userID)
	if githubToken != "" {
		ghClient := github.NewClient(githubToken)
		if err := ghClient.UpdateWebhookStatus(c.Context(), reg.RepoOwner, reg.RepoName, reg.GithubHookID, req.Active); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update webhook on GitHub"})
		}
	}

	if err := db.UpdateWebhookRegistrationStatus(c.Context(), wh.db, webhookID, userID, req.Active); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update DB"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (wh *WebhookHandler) HandleListWebhooks(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	regs, err := db.GetWebhookRegistrations(c.Context(), wh.db, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list webhooks"})
	}
	return c.JSON(regs)
}

func (wh *WebhookHandler) HandleListWebhookEvents(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	webhookID := c.Params("webhookID")

	_, err := db.GetWebhookRegistration(c.Context(), wh.db, webhookID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Webhook not found"})
	}

	events, err := db.GetWebhookEvents(c.Context(), wh.db, webhookID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list events"})
	}
	return c.JSON(events)
}
