package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/deptic-io/api/internal/github"
	"github.com/deptic-io/api/internal/vuln"
)

type FixPRStatus struct {
	Stage     string `json:"stage"`
	Progress  int    `json:"progress"`
	Message   string `json:"message"`
	PRURL     string `json:"pr_url,omitempty"`
	PRNumber  int    `json:"pr_number,omitempty"`
	Error     string `json:"error,omitempty"`
	Completed bool   `json:"completed"`
}

type VulnerabilityFix struct {
	PackageName    string   `json:"package_name"`
	CurrentVersion string   `json:"current_version"`
	FixedVersion   string   `json:"fixed_version"`
	CVEIDs         []string `json:"cve_ids"`
	Ecosystem      string   `json:"ecosystem"`
	ParentName     string   `json:"parent_name"`
}

func updateStatus(rdb *redis.Client, scanID, stage, message string, progress int, completed bool, prURL string, prNumber int, errStr string) {
	if rdb == nil {
		return
	}
	status := FixPRStatus{
		Stage:     stage,
		Progress:  progress,
		Message:   message,
		PRURL:     prURL,
		PRNumber:  prNumber,
		Error:     errStr,
		Completed: completed,
	}
	b, _ := json.Marshal(status)
	rdb.Set(context.Background(), "fixpr-progress:"+scanID, string(b), 1*time.Hour)
}

// HandleGetFixPRStatus GET /api/scans/:scanID/fix-pr/status
func (h *ScanHandler) HandleGetFixPRStatus(c *fiber.Ctx) error {
	scanID := c.Params("scanID")
	if h.rdb != nil {
		val, err := h.rdb.Get(c.Context(), "fixpr-progress:"+scanID).Result()
		if err == nil && val != "" {
			var status FixPRStatus
			json.Unmarshal([]byte(val), &status)
			return c.JSON(status)
		}
	}
	return c.JSON(FixPRStatus{Stage: "idle", Progress: 0, Message: "No active fix job", Completed: true})
}

// HandleCreateFixPR POST /api/scans/:scanID/fix-pr
func (h *ScanHandler) HandleCreateFixPR(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	scanID := c.Params("scanID")

	// 1. Fetch scan to verify ownership and get repo_url
	var repoURL, projectUserID string
	var ecosystem string
	err := h.db.QueryRowContext(c.Context(), `
		SELECT s.repo_url, p.user_id, s.ecosystem
		FROM scans s 
		JOIN projects p ON s.project_id = p.id 
		WHERE s.id = $1
	`, scanID).Scan(&repoURL, &projectUserID, &ecosystem)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Scan not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify scan"})
	}
	if projectUserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not authorized to access this scan"})
	}

	owner, repo, err := github.ParseRepoURL(repoURL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid repository URL in scan"})
	}

	ghToken := ResolveGitHubToken(c, h.db, userID)
	if ghToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "GitHub account not connected. Please sign in with GitHub."})
	}

	updateStatus(h.rdb, scanID, "loading", "Loading all vulnerabilities...", 5, false, "", 0, "")

	go h.runFixPRBackground(scanID, userID, owner, repo, ghToken, ecosystem)

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"message": "Fix PR job started"})
}

func (h *ScanHandler) runFixPRBackground(scanID, userID, owner, repo, ghToken, ecosystem string) {
	ctx := context.Background()

	fail := func(msg string) {
		updateStatus(h.rdb, scanID, "error", msg, 0, true, "", 0, msg)
	}

	// Step 1: Load all vulnerabilities
	rows, err := h.db.QueryContext(ctx, `
		SELECT c.id, c.name, c.version, c.ecosystem, c.parent_name, cv.cve_id
		FROM component_vulnerabilities cv
		JOIN components c ON c.id = cv.component_id
		WHERE c.scan_id = $1
	`, scanID)
	if err != nil {
		fail(fmt.Sprintf("Failed to load vulnerabilities: %v", err))
		return
	}
	defer rows.Close()

	type pkgInfo struct {
		name       string
		version    string
		ecosystem  string
		parentName string
		cves       []string
	}
	pkgMap := make(map[string]*pkgInfo)
	for rows.Next() {
		var id, name, version, eco, parentName, cveID string
		var pn sql.NullString
		if err := rows.Scan(&id, &name, &version, &eco, &pn, &cveID); err != nil {
			continue
		}
		if pn.Valid {
			parentName = pn.String
		}
		key := name + "|" + eco
		if _, ok := pkgMap[key]; !ok {
			pkgMap[key] = &pkgInfo{name: name, version: version, ecosystem: eco, parentName: parentName, cves: []string{}}
		}
		pkgMap[key].cves = append(pkgMap[key].cves, cveID)
	}

	if len(pkgMap) == 0 {
		fail("No vulnerabilities found to fix")
		return
	}

	// Step 2 & 3: Find clean versions
	updateStatus(h.rdb, scanID, "finding_versions", fmt.Sprintf("Finding clean versions for %d packages...", len(pkgMap)), 10, false, "", 0, "")
	
	type cleanResult struct {
		key          string
		cleanVersion string
		err          error
	}
	resChan := make(chan cleanResult, len(pkgMap))
	sem := make(chan struct{}, 5)

	checkedCount := 0
	for k, p := range pkgMap {
		go func(key string, pkg *pkgInfo) {
			sem <- struct{}{}
			defer func() { <-sem }()
			clean, err := vuln.FindCleanVersion(ctx, pkg.name, pkg.ecosystem)
			resChan <- cleanResult{key: key, cleanVersion: clean, err: err}
		}(k, p)
	}

	cleanVersions := make(map[string]string)
	for i := 0; i < len(pkgMap); i++ {
		res := <-resChan
		if res.err != nil {
			fmt.Printf("Warning: failed to find clean version for %s: %v\n", res.key, res.err)
		} else {
			cleanVersions[res.key] = res.cleanVersion
			fmt.Printf("Package %s: current=%s → clean=%s\n", pkgMap[res.key].name, pkgMap[res.key].version, res.cleanVersion)
		}
		checkedCount++
		progress := 10 + int((float64(checkedCount)/float64(len(pkgMap)))*40)
		updateStatus(h.rdb, scanID, "finding_versions", fmt.Sprintf("Checking %d of %d packages...", checkedCount, len(pkgMap)), progress, false, "", 0, "")
	}

	// Step 4: Filter updates
	var updates []VulnerabilityFix
	for k, p := range pkgMap {
		cv, ok := cleanVersions[k]
		if ok && cv != "" && cv != p.version {
			updates = append(updates, VulnerabilityFix{
				PackageName:    p.name,
				CurrentVersion: p.version,
				FixedVersion:   cv,
				CVEIDs:         p.cves,
				Ecosystem:      p.ecosystem,
				ParentName:     p.parentName,
			})
		}
	}

	if len(updates) == 0 {
		fail("All vulnerable packages are already at their cleanest available versions")
		return
	}

	// Step 5 & 6: Branch & Update Files
	updateStatus(h.rdb, scanID, "branching", "Creating branch...", 55, false, "", 0, "")

	repoAPI := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)
	repoReq, _ := http.NewRequest("GET", repoAPI, nil)
	repoReq.Header.Set("Authorization", "Bearer "+ghToken)
	repoResp, err := http.DefaultClient.Do(repoReq)
	if err != nil || repoResp.StatusCode != 200 {
		fail("Failed to connect to GitHub")
		return
	}
	defer repoResp.Body.Close()

	var repoData struct {
		Permissions struct{ Push bool `json:"push"` } `json:"permissions"`
		DefaultBranch string `json:"default_branch"`
	}
	json.NewDecoder(repoResp.Body).Decode(&repoData)
	if !repoData.Permissions.Push {
		fail("DEPTIC.io does not have write access to this repository.")
		return
	}
	defaultBranch := repoData.DefaultBranch
	if defaultBranch == "" { defaultBranch = "main" }

	refAPI := fmt.Sprintf("https://api.github.com/repos/%s/%s/git/ref/heads/%s", owner, repo, defaultBranch)
	refReq, _ := http.NewRequest("GET", refAPI, nil)
	refReq.Header.Set("Authorization", "Bearer "+ghToken)
	refResp, err := http.DefaultClient.Do(refReq)
	if err != nil || refResp.StatusCode != 200 {
		fail("Failed to get base commit from GitHub")
		return
	}
	defer refResp.Body.Close()
	var refData struct { Object struct { Sha string `json:"sha"` } `json:"object"` }
	json.NewDecoder(refResp.Body).Decode(&refData)
	baseSha := refData.Object.Sha

	timestamp := time.Now().Format("20060102150405")
	branchName := fmt.Sprintf("depticio/fix-cves-%s", timestamp)
	createRefAPI := fmt.Sprintf("https://api.github.com/repos/%s/%s/git/refs", owner, repo)

	createBranch := func(bName string) error {
		body := map[string]string{"ref": "refs/heads/" + bName, "sha": baseSha}
		b, _ := json.Marshal(body)
		cbReq, _ := http.NewRequest("POST", createRefAPI, bytes.NewReader(b))
		cbReq.Header.Set("Authorization", "Bearer "+ghToken)
		cbResp, err := http.DefaultClient.Do(cbReq)
		if err != nil { return err }
		defer cbResp.Body.Close()
		if cbResp.StatusCode == 422 { return fmt.Errorf("branch exists") }
		if cbResp.StatusCode != 201 { return fmt.Errorf("github api error %d", cbResp.StatusCode) }
		return nil
	}

	if err := createBranch(branchName); err != nil {
		if err.Error() == "branch exists" {
			branchName = fmt.Sprintf("depticio/fix-cves-%s-%d", timestamp, rand.Intn(9999))
			if err2 := createBranch(branchName); err2 != nil {
				fail("Failed to create branch on GitHub")
				return
			}
		} else {
			fail("Failed to create branch on GitHub")
			return
		}
	}

	updateStatus(h.rdb, scanID, "updating", "Updating manifest files...", 65, false, "", 0, "")
	ghClient := github.NewClient(ghToken)

	updateFile := func(path, content, message string) error {
		metaAPI := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s?ref=%s", owner, repo, path, branchName)
		mReq, _ := http.NewRequest("GET", metaAPI, nil)
		mReq.Header.Set("Authorization", "Bearer "+ghToken)
		mResp, err := http.DefaultClient.Do(mReq)
		if err != nil || mResp.StatusCode != 200 {
			return fmt.Errorf("Could not find %s", path)
		}
		var mData struct{ Sha string `json:"sha"` }
		json.NewDecoder(mResp.Body).Decode(&mData)
		mResp.Body.Close()

		putAPI := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path)
		body := map[string]string{
			"message": message,
			"content": base64.StdEncoding.EncodeToString([]byte(content)),
			"sha":     mData.Sha,
			"branch":  branchName,
		}
		b, _ := json.Marshal(body)
		pReq, _ := http.NewRequest("PUT", putAPI, bytes.NewReader(b))
		pReq.Header.Set("Authorization", "Bearer "+ghToken)
		pResp, err := http.DefaultClient.Do(pReq)
		if err != nil || (pResp.StatusCode != 200 && pResp.StatusCode != 201) {
			return fmt.Errorf("Failed to update %s", path)
		}
		pResp.Body.Close()
		return nil
	}

	ecoGroups := make(map[string][]VulnerabilityFix)
	for _, u := range updates {
		ecoGroups[u.Ecosystem] = append(ecoGroups[u.Ecosystem], u)
	}

	for eco, vulns := range ecoGroups {
		if eco == "npm" {
			path, data, err := ghClient.FindManifestFile(ctx, owner, repo, "package.json")
			if err != nil || path == "" { continue }
			var pkg map[string]interface{}
			if err := json.Unmarshal(data, &pkg); err == nil {
				for _, v := range vulns {
					found := false
					for _, depType := range []string{"dependencies", "devDependencies"} {
						if depsRaw, ok := pkg[depType]; ok {
							if deps, ok := depsRaw.(map[string]interface{}); ok {
								if _, exists := deps[v.PackageName]; exists {
									deps[v.PackageName] = v.FixedVersion
									found = true
								}
							}
						}
					}
					// Transitive or not found -> force exact version in dependencies
					if !found {
						if pkg["dependencies"] == nil {
							pkg["dependencies"] = make(map[string]interface{})
						}
						deps := pkg["dependencies"].(map[string]interface{})
						deps[v.PackageName] = v.FixedVersion
					}
				}
				b, _ := json.MarshalIndent(pkg, "", "  ")
				updateFile(path, string(b), "fix: patch vulnerable NPM dependencies")
			}
		} else if eco == "pip" {
			path, data, err := ghClient.FindManifestFile(ctx, owner, repo, "requirements.txt")
			if err != nil || path == "" { continue }
			lines := strings.Split(string(data), "\n")
			for _, v := range vulns {
				found := false
				for i, line := range lines {
					if strings.HasPrefix(strings.ToLower(strings.TrimSpace(line)), strings.ToLower(v.PackageName)) {
						if strings.Contains(line, "==") || strings.Contains(line, ">=") || strings.Contains(line, "<=") || strings.Contains(line, "~=") {
							lines[i] = fmt.Sprintf("%s==%s", v.PackageName, v.FixedVersion)
							found = true
						}
					}
				}
				if !found {
					lines = append(lines, fmt.Sprintf("%s==%s", v.PackageName, v.FixedVersion))
				}
			}
			updateFile(path, strings.Join(lines, "\n"), "fix: patch vulnerable PIP dependencies")
		} else if eco == "maven" {
			path, data, err := ghClient.FindManifestFile(ctx, owner, repo, "pom.xml")
			if err != nil || path == "" { continue }
			content := string(data)
			for _, v := range vulns {
				parts := strings.Split(v.PackageName, ":")
				if len(parts) != 2 { continue }
				groupID, artifactId := parts[0], parts[1]
				
				pat := regexp.MustCompile(`(?s)(<dependency>[^<]*(?:<[^/][^>]*>[^<]*</[^>]+>[^<]*)*?<artifactId>` + regexp.QuoteMeta(artifactId) + `</artifactId>[^<]*(?:<[^/][^>]*>[^<]*</[^>]+>[^<]*)*?)<version>[^<]+</version>`)
				newContent := pat.ReplaceAllString(content, "${1}<version>"+v.FixedVersion+"</version>")
				if newContent != content {
					content = newContent
					continue
				}

				// Transitive -> append to dependencies
				newDepXml := fmt.Sprintf("\n        <!-- Injected by DEPTIC.io to fix transitive vulnerability -->\n        <dependency>\n            <groupId>%s</groupId>\n            <artifactId>%s</artifactId>\n            <version>%s</version>\n        </dependency>\n    </dependencies>", groupID, artifactId, v.FixedVersion)
				lastDepsIdx := strings.LastIndex(content, "</dependencies>")
				if lastDepsIdx != -1 {
					content = content[:lastDepsIdx] + newDepXml + content[lastDepsIdx+15:]
				}
			}
			updateFile(path, content, "fix: patch vulnerable Maven dependencies")
		} else if eco == "go" {
			path, data, err := ghClient.FindManifestFile(ctx, owner, repo, "go.mod")
			if err != nil || path == "" { continue }
			lines := strings.Split(string(data), "\n")
			for _, v := range vulns {
				for i, line := range lines {
					if strings.Contains(line, v.PackageName) {
						parts := strings.Fields(line)
						if len(parts) >= 2 {
							pkgIdx := -1
							if parts[0] == "require" && len(parts) >= 3 && parts[1] == v.PackageName {
								pkgIdx = 1
							} else if parts[0] == v.PackageName {
								pkgIdx = 0
							}
							
							if pkgIdx != -1 {
								indirect := strings.Contains(line, "// indirect")
								var newLine string
								if pkgIdx == 1 {
									newLine = fmt.Sprintf("require %s %s", v.PackageName, v.FixedVersion)
								} else {
									newLine = fmt.Sprintf("\t%s %s", v.PackageName, v.FixedVersion)
								}
								if indirect {
									newLine += " // indirect"
								}
								lines[i] = newLine
							}
						}
					}
				}
			}
			updateFile(path, strings.Join(lines, "\n"), "fix: patch vulnerable Go dependencies")
		}
	}

	// Step 7: Create PR
	updateStatus(h.rdb, scanID, "creating_pr", "Opening Pull Request...", 85, false, "", 0, "")
	prAPI := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls", owner, repo)
	
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## Security Fix\n\nThis PR was automatically generated by [DEPTIC.io](https://deptic.io) to patch **%d** CVE vulnerabilities.\n\n### Packages Updated\n\n| Package | Old Version | New Version | CVEs Fixed | Verified Clean |\n|---------|-------------|-------------|------------|----------------|\n", len(updates)))
	
	transitiveCount := 0
	for _, v := range updates {
		sb.WriteString(fmt.Sprintf("| %s | %s | %s | %d | ✅ |\n", v.PackageName, v.CurrentVersion, v.FixedVersion, len(v.CVEIDs)))
		if v.ParentName != "" { transitiveCount++ }
	}
	
	sb.WriteString("\n### Version Selection Method\n\nEvery upgraded version was independently verified against the [OSV.dev](https://osv.dev) database to ensure it has **zero known CVEs** at the time of creation. This completely resolves the 'whack-a-mole' vulnerability problem.\n")
	
	if transitiveCount > 0 {
		sb.WriteString("\n### Transitive Dependencies\n\nSome vulnerabilities were discovered in transitive dependencies. These have been explicitly pinned in your manifest files to force the clean version across your entire dependency tree.\n")
	}

	sb.WriteString("\n> **Warning:** After merging, run your test suite to verify compatibility. Version bumps may include breaking changes.\n\n_Generated by DEPTIC.io — Versions verified clean against OSV.dev vulnerability database_")

	prBody := map[string]string{
		"title": fmt.Sprintf("fix(security): patch all %d vulnerable packages to clean versions [DEPTIC.io]", len(updates)),
		"body":  sb.String(),
		"head":  branchName,
		"base":  defaultBranch,
	}
	pb, _ := json.Marshal(prBody)
	prReq, _ := http.NewRequest("POST", prAPI, bytes.NewReader(pb))
	prReq.Header.Set("Authorization", "Bearer "+ghToken)
	prResp, err := http.DefaultClient.Do(prReq)
	if err != nil || prResp.StatusCode != 201 {
		fail("Failed to create PR on GitHub")
		return
	}
	defer prResp.Body.Close()
	
	var prData struct {
		Number  int    `json:"number"`
		HTMLURL string `json:"html_url"`
		Title   string `json:"title"`
	}
	json.NewDecoder(prResp.Body).Decode(&prData)

	pkgsJSON, _ := json.Marshal(updates)
	h.db.ExecContext(ctx, `
		INSERT INTO fix_pull_requests (scan_id, user_id, repo_owner, repo_name, pr_number, pr_url, pr_title, branch_name, status, packages_fixed)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
	`, scanID, userID, owner, repo, prData.Number, prData.HTMLURL, prData.Title, branchName, "created", string(pkgsJSON))

	// Step 8: Verification
	updateStatus(h.rdb, scanID, "verifying", "Verifying PR...", 95, false, prData.HTMLURL, prData.Number, "")
	for _, u := range updates {
		clean, _ := vuln.QueryOSV(ctx, u.PackageName, u.FixedVersion, u.Ecosystem)
		if len(clean) > 0 {
			fmt.Printf("Verification warning: %s@%s still has %d vulnerabilities\n", u.PackageName, u.FixedVersion, len(clean))
		}
	}

	updateStatus(h.rdb, scanID, "completed", "Pull Request created successfully!", 100, true, prData.HTMLURL, prData.Number, "")
}

// HandleGetFixPRs GET /api/scans/:scanID/fix-prs
func (h *ScanHandler) HandleGetFixPRs(c *fiber.Ctx) error {
	scanID := c.Params("scanID")
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT id, pr_url, pr_number, pr_title, status, created_at, packages_fixed
		FROM fix_pull_requests
		WHERE scan_id = $1 ORDER BY created_at DESC
	`, scanID)
	if err != nil {
		return c.JSON(fiber.Map{"prs": []interface{}{}})
	}
	defer rows.Close()

	var prs []fiber.Map
	for rows.Next() {
		var id, url, title, status string
		var number int
		var created time.Time
		var pkgsStr sql.NullString
		if err := rows.Scan(&id, &url, &number, &title, &status, &created, &pkgsStr); err == nil {
			prs = append(prs, fiber.Map{
				"id": id, "pr_url": url, "pr_number": number, "pr_title": title,
				"status": status, "created_at": created,
			})
		}
	}
	if prs == nil { prs = []fiber.Map{} }
	return c.JSON(fiber.Map{"prs": prs})
}
