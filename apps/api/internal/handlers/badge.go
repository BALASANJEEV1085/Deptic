package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type BadgeHandler struct {
	db *sql.DB
}

func RegisterBadgeRoutes(app *fiber.App, api fiber.Router, db *sql.DB) {
	h := &BadgeHandler{db: db}

	// Public routes (no auth)
	app.Get("/badge/github/:owner/:repo", h.ServeBadge)
	app.Get("/badge/github/:owner/:repo/extended", h.ServeBadgeExtended)
	app.Get("/badge/github/:owner/:repo/embed", h.ServeBadgeEmbed)

	// Authenticated routes
	api.Post("/badge/add-to-readme", h.AddBadgeToReadme)
}

func badgeColor(score int) string {
	if score >= 95 {
		return "#22c55e" // green
	}
	if score >= 75 {
		return "#f59e0b" // amber
	}
	if score >= 50 {
		return "#f97316" // orange
	}
	return "#ef4444" // red
}

func badgeLabel(score int) string {
	if score >= 95 {
		return "compliant"
	}
	if score >= 75 {
		return "partial"
	}
	return "non-compliant"
}

func GenerateBadgeSVG(score int, statusLabel, color, ecosystem string) string {
	leftText := "deptic"
	rightText := fmt.Sprintf("%d/100 %s", score, statusLabel)
	if ecosystem != "" {
		rightText += " " + ecosystem
	}

	leftWidth := len(leftText)*6 + 16
	rightWidth := len(rightText)*6 + 16
	totalWidth := leftWidth + rightWidth

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="%d" height="20">
  <linearGradient id="s" x2="0" y2="100%%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="%d" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="%d" height="20" fill="#555"/>
    <rect x="%d" width="%d" height="20" fill="%s"/>
    <rect width="%d" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle"
     font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="%d" y="150" fill="#010101" fill-opacity=".3"
          transform="scale(.1)" textLength="%d"
          lengthAdjust="spacing">%s</text>
    <text x="%d" y="140" transform="scale(.1)"
          textLength="%d" lengthAdjust="spacing">%s</text>
    <text x="%d" y="150" fill="#010101" fill-opacity=".3"
          transform="scale(.1)" textLength="%d"
          lengthAdjust="spacing">%s</text>
    <text x="%d" y="140" transform="scale(.1)"
          textLength="%d" lengthAdjust="spacing">%s</text>
  </g>
</svg>`,
		totalWidth, totalWidth,
		leftWidth, leftWidth, rightWidth, color,
		totalWidth,
		(leftWidth/2)*10+5, (len(leftText)*60), leftText,
		(leftWidth/2)*10+5, (len(leftText)*60), leftText,
		(leftWidth+(rightWidth/2))*10+5, (len(rightText)*60), rightText,
		(leftWidth+(rightWidth/2))*10+5, (len(rightText)*60), rightText,
	)
}

func (h *BadgeHandler) getScanInfo(owner, repo string) (int, string, string, bool) {
	var score int
	var ecosystem string
	var createdAt time.Time
	
	searchURL := fmt.Sprintf("%%github.com/%s/%s%%", owner, repo)
	err := h.db.QueryRowContext(context.Background(), `
		SELECT compliance_score, ecosystem, created_at
		FROM scans
		WHERE repo_url ILIKE $1
		  AND status = 'done'
		ORDER BY created_at DESC
		LIMIT 1
	`, searchURL).Scan(&score, &ecosystem, &createdAt)

	if err != nil {
		return 0, "", "", false
	}
	return score, ecosystem, createdAt.Format(time.RFC3339), true
}

func (h *BadgeHandler) setSVGHeaders(c *fiber.Ctx) {
	c.Set("Content-Type", "image/svg+xml")
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	c.Set("X-Content-Type-Options", "nosniff")
}

func (h *BadgeHandler) ServeBadge(c *fiber.Ctx) error {
	owner := c.Params("owner")
	repo := c.Params("repo")

	score, _, _, found := h.getScanInfo(owner, repo)
	h.setSVGHeaders(c)

	if !found {
		return c.SendString(GenerateBadgeSVG(0, "not scanned", "#9f9f9f", ""))
	}

	return c.SendString(GenerateBadgeSVG(score, badgeLabel(score), badgeColor(score), ""))
}

func (h *BadgeHandler) ServeBadgeExtended(c *fiber.Ctx) error {
	owner := c.Params("owner")
	repo := c.Params("repo")

	score, ecosystem, _, found := h.getScanInfo(owner, repo)
	h.setSVGHeaders(c)

	if !found {
		return c.SendString(GenerateBadgeSVG(0, "not scanned", "#9f9f9f", ""))
	}

	return c.SendString(GenerateBadgeSVG(score, badgeLabel(score), badgeColor(score), ecosystem))
}

func (h *BadgeHandler) ServeBadgeEmbed(c *fiber.Ctx) error {
	owner := c.Params("owner")
	repo := c.Params("repo")

	score, _, createdAt, found := h.getScanInfo(owner, repo)
	
	status := "Not scanned yet"
	color := "#9f9f9f"
	if found {
		status = badgeLabel(score)
		color = badgeColor(score)
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<title>Deptic Badge - %s/%s</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
		.card { background: #111; border: 1px solid #333; border-radius: 8px; padding: 30px; max-width: 600px; width: 100%%; text-align: center; }
		h1 { margin-top: 0; font-size: 24px; font-weight: 600; margin-bottom: 20px; }
		.badge-preview { margin-bottom: 30px; padding: 20px; background: #000; border-radius: 6px; border: 1px solid #222; }
		.snippets { text-align: left; margin-bottom: 20px; }
		.snippet { margin-bottom: 15px; }
		.snippet-title { font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
		.code { background: #000; padding: 12px; border-radius: 6px; border: 1px solid #333; font-family: monospace; font-size: 13px; color: #a5d6ff; word-break: break-all; }
		.summary { margin-top: 30px; font-size: 14px; color: #aaa; text-align: left; border-top: 1px solid #333; padding-top: 20px; }
		.stat { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.stat-val { color: #fff; font-weight: 600; }
	</style>
</head>
<body>
	<div class="card">
		<h1>Deptic Security Badge</h1>
		<div class="badge-preview">
			<img src="/badge/github/%s/%s" alt="Deptic Badge" />
		</div>
		<div class="snippets">
			<div class="snippet">
				<div class="snippet-title">Markdown</div>
				<div class="code">[![Deptic Security](http://localhost:8081/badge/github/%s/%s)](http://localhost:3000/dashboard)</div>
			</div>
			<div class="snippet">
				<div class="snippet-title">HTML</div>
				<div class="code">&lt;a href="http://localhost:3000/dashboard"&gt;&lt;img src="http://localhost:8081/badge/github/%s/%s" alt="Deptic Security" /&gt;&lt;/a&gt;</div>
			</div>
		</div>
		<div class="summary">
			<div class="stat"><span>Repository:</span> <span class="stat-val">%s/%s</span></div>
			<div class="stat"><span>Last Scan:</span> <span class="stat-val">%s</span></div>
			<div class="stat"><span>Status:</span> <span class="stat-val" style="color: %s">%s</span></div>
		</div>
	</div>
</body>
</html>`, owner, repo, owner, repo, owner, repo, owner, repo, owner, repo, createdAt, color, status)

	c.Set("Content-Type", "text/html")
	return c.SendString(html)
}

type addBadgeReq struct {
	RepoOwner string `json:"repo_owner"`
	RepoName  string `json:"repo_name"`
}

func (h *BadgeHandler) AddBadgeToReadme(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	
	var req addBadgeReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}
	
	owner := req.RepoOwner
	repo := req.RepoName

	// 1. Get GitHub Token
	githubToken := c.Get("X-GitHub-Token")
	if githubToken == "" {
		var providerToken sql.NullString
		h.db.QueryRowContext(c.Context(), "SELECT identity_data->>'provider_token' FROM auth.identities WHERE user_id = $1 AND provider = 'github' LIMIT 1", userID).Scan(&providerToken)
		githubToken = providerToken.String
	}
	if githubToken == "" {
		githubToken = os.Getenv("GITHUB_TOKEN")
	}
	if githubToken == "" {
		return c.Status(401).JSON(fiber.Map{"error": "GitHub not connected"})
	}

	badgeURL := fmt.Sprintf("http://localhost:8081/badge/github/%s/%s", owner, repo)
	dashboardURL := "http://localhost:3000/dashboard"
	badgeMarkdown := fmt.Sprintf("[![Deptic Security](%s)](%s)", badgeURL, dashboardURL)

	// Helper for GitHub requests
	githubReq := func(method, url string, body []byte) (*http.Response, error) {
		var bodyReader io.Reader
		if body != nil {
			bodyReader = bytes.NewReader(body)
		}
		req, _ := http.NewRequest(method, url, bodyReader)
		req.Header.Set("Authorization", "Bearer "+githubToken)
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		return http.DefaultClient.Do(req)
	}

	// 2. Fetch repo info (permissions & default branch)
	repoResp, err := githubReq("GET", fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo), nil)
	if err != nil || repoResp.StatusCode != 200 {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch repository info"})
	}
	var repoData struct {
		Permissions   struct { Push bool `json:"push"` } `json:"permissions"`
		DefaultBranch string `json:"default_branch"`
	}
	json.NewDecoder(repoResp.Body).Decode(&repoData)
	repoResp.Body.Close()
	
	if !repoData.Permissions.Push {
		return c.Status(403).JSON(fiber.Map{"error": "Deptic does not have write access to this repository"})
	}
	defaultBranch := repoData.DefaultBranch

	// 3. Find README
	var readmeContent string
	var readmeSha string
	var readmePath = "README.md"
	var readmeFound bool

	readmeResp, err := githubReq("GET", fmt.Sprintf("https://api.github.com/repos/%s/%s/readme", owner, repo), nil)
	if err == nil && readmeResp.StatusCode == 200 {
		var readmeData struct {
			Content string `json:"content"`
			Sha     string `json:"sha"`
			Path    string `json:"path"`
		}
		json.NewDecoder(readmeResp.Body).Decode(&readmeData)
		
		decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(readmeData.Content, "\n", ""))
		if err == nil {
			readmeContent = string(decoded)
			readmeSha = readmeData.Sha
			readmePath = readmeData.Path
			readmeFound = true
		}
	}
	if readmeResp != nil { readmeResp.Body.Close() }

	// 4. Update or Create README
	if readmeFound {
		if strings.Contains(readmeContent, "badge/github/") || strings.Contains(readmeContent, "deptic.in/badge") {
			return c.JSON(fiber.Map{
				"status": "already_exists",
				"message": "Badge already exists in README",
			})
		}
		readmeContent = badgeMarkdown + "\n\n" + readmeContent
	} else {
		readmeContent = fmt.Sprintf("# %s\n\n%s\n\n## About\n\nThis repository uses [Deptic](http://localhost:3000) for automated software supply chain security scanning and SBOM generation.\n", repo, badgeMarkdown)
	}

	// 5. Get base SHA for branching
	refResp, err := githubReq("GET", fmt.Sprintf("https://api.github.com/repos/%s/%s/git/ref/heads/%s", owner, repo, defaultBranch), nil)
	if err != nil || refResp.StatusCode != 200 {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get base branch SHA"})
	}
	var refData struct { Object struct { Sha string `json:"sha"` } `json:"object"` }
	json.NewDecoder(refResp.Body).Decode(&refData)
	refResp.Body.Close()
	baseSha := refData.Object.Sha

	// 6. Create Branch
	timestamp := time.Now().Format("20060102150405")
	branchName := fmt.Sprintf("deptic/add-security-badge-%s", timestamp)
	
	branchBody := map[string]string{"ref": "refs/heads/" + branchName, "sha": baseSha}
	bb, _ := json.Marshal(branchBody)
	cbResp, err := githubReq("POST", fmt.Sprintf("https://api.github.com/repos/%s/%s/git/refs", owner, repo), bb)
	if err != nil || (cbResp.StatusCode != 201 && cbResp.StatusCode != 422) {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create branch"})
	}
	if cbResp != nil { cbResp.Body.Close() }

	// 7. Commit README
	commitBody := map[string]string{
		"message": "docs: add Deptic security badge",
		"content": base64.StdEncoding.EncodeToString([]byte(readmeContent)),
		"branch":  branchName,
	}
	if readmeFound {
		commitBody["sha"] = readmeSha
	}
	cb, _ := json.Marshal(commitBody)
	commitResp, err := githubReq("PUT", fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, readmePath), cb)
	if err != nil || (commitResp.StatusCode != 200 && commitResp.StatusCode != 201) {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to commit README changes"})
	}
	if commitResp != nil { commitResp.Body.Close() }

	// 8. Create Pull Request
	prBody := map[string]string{
		"title": "docs: add Deptic security compliance badge",
		"body": fmt.Sprintf("## Security Badge\n\nThis PR adds a live Deptic security compliance badge to the README.\n\nThe badge shows real-time:\n- NTIA compliance score (0-100)\n- Compliance status (Compliant / Partial / Non-Compliant)\n\nBadge preview:\n%s\n\nThe badge updates automatically after every scan.\n\n---\n*Generated by [Deptic](http://localhost:3000) — Software Supply Chain Security*", badgeMarkdown),
		"head":  branchName,
		"base":  defaultBranch,
	}
	pb, _ := json.Marshal(prBody)
	prResp, err := githubReq("POST", fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls", owner, repo), pb)
	if err != nil || prResp.StatusCode != 201 {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create pull request"})
	}
	
	var prData struct {
		Number  int    `json:"number"`
		HTMLURL string `json:"html_url"`
	}
	json.NewDecoder(prResp.Body).Decode(&prData)
	prResp.Body.Close()

	return c.JSON(fiber.Map{
		"status": "pr_created",
		"pr_url": prData.HTMLURL,
		"pr_number": prData.Number,
		"readme_created": !readmeFound,
		"badge_url": badgeURL,
	})
}
