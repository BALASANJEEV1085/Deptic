package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/sbom-io/api/internal/compliance"
	"github.com/sbom-io/api/internal/github"
	"github.com/sbom-io/api/internal/report"
	"github.com/sbom-io/api/internal/sbom"
	"github.com/sbom-io/api/internal/scanner"
	"github.com/sbom-io/api/internal/storage"
	"github.com/sbom-io/api/internal/vuln"
)

const keyAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// generateRandKey produces a cryptographically random 40-char alphanumeric string.
func generateRandKey() (string, error) {
	b := make([]byte, 40)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(keyAlphabet))))
		if err != nil {
			return "", err
		}
		b[i] = keyAlphabet[n.Int64()]
	}
	return string(b), nil
}

// hashKey returns the SHA-256 hex digest of the given key string.
func hashKey(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/keys  (JWT-protected)
// ────────────────────────────────────────────────────────────────────────────

type createKeyRequest struct {
	Name string `json:"name"`
}

func (h *ScanHandler) HandleCreateKey(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req createKeyRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	// Generate raw key
	rand40, err := generateRandKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate key"})
	}
	rawKey := "sbomio_" + rand40  // 47 chars total
	keyHash := hashKey(rawKey)
	keyPrefix := rawKey[:12] // "sbomio_xxxxx"

	var id string
	err = h.db.QueryRowContext(c.Context(), `
		INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, userID, strings.TrimSpace(req.Name), keyHash, keyPrefix).Scan(&id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to store key: " + err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"key":    rawKey,
		"id":     id,
		"prefix": keyPrefix,
	})
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/keys  (JWT-protected)
// ────────────────────────────────────────────────────────────────────────────

type apiKeyRow struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	KeyPrefix string  `json:"key_prefix"`
	Used      bool    `json:"used"`
	UsedAt    *string `json:"used_at"`
	CreatedAt string  `json:"created_at"`
}

func (h *ScanHandler) HandleListKeys(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := h.db.QueryContext(c.Context(), `
		SELECT id, name, key_prefix, used,
		       to_char(used_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM api_keys
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to query keys"})
	}
	defer rows.Close()

	var keys []apiKeyRow
	for rows.Next() {
		var k apiKeyRow
		var usedAt *string
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.Used, &usedAt, &k.CreatedAt); err != nil {
			continue
		}
		k.UsedAt = usedAt
		keys = append(keys, k)
	}
	if keys == nil {
		keys = []apiKeyRow{}
	}
	return c.JSON(fiber.Map{"keys": keys})
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/keys/:keyID  (JWT-protected)
// ────────────────────────────────────────────────────────────────────────────

func (h *ScanHandler) HandleDeleteKey(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	keyID := c.Params("keyID")

	res, err := h.db.ExecContext(c.Context(), `
		DELETE FROM api_keys WHERE id = $1 AND user_id = $2
	`, keyID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete key"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "key not found"})
	}
	return c.JSON(fiber.Map{"deleted": true})
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/scan-cli  (NO JWT — authenticated by X-API-Key header)
// ────────────────────────────────────────────────────────────────────────────

type cliScanRequest struct {
	GithubURL string `json:"github_url"`
}

func (h *ScanHandler) ScanCLI(c *fiber.Ctx) error {
	rawKey := c.Get("X-API-Key")
	if rawKey == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing X-API-Key header"})
	}

	keyHash := hashKey(rawKey)

	// Look up key
	var keyID string
	var used bool
	err := h.db.QueryRowContext(c.Context(), `
		SELECT id, used FROM api_keys WHERE key_hash = $1
	`, keyHash).Scan(&keyID, &used)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid API key"})
	}
	if used {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "This API key has already been used. Each key allows one scan."})
	}

	// Mark used immediately (before scan, so concurrent requests can't reuse)
	_, err = h.db.ExecContext(c.Context(), `
		UPDATE api_keys SET used = true, used_at = NOW() WHERE id = $1
	`, keyID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to consume key"})
	}

	var req cliScanRequest
	if err := c.BodyParser(&req); err != nil || req.GithubURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "github_url is required"})
	}

	owner, repo, err := github.ParseRepoURL(req.GithubURL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid GitHub URL"})
	}

	// Run scan synchronously (CLI blocks until done)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	ghClient := github.NewClient("")
	allManifests, err := ghClient.FindAllManifests(ctx, owner, repo)
	if err != nil || len(allManifests) == 0 {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "No supported manifests found in repository"})
	}

	var allPackages []scanner.Package
	var mu sync.Mutex
	var wg sync.WaitGroup

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
				filename := m.Path
				if idx := strings.LastIndex(m.Path, "/"); idx >= 0 {
					filename = m.Path[idx+1:]
				}
				pkgs, scanErr = scanner.ScanPip(ctx, h.rdb, m.Data, filename)
			case "maven":
				pkgs, scanErr = scanner.ScanMaven(ctx, h.rdb, m.Data)
			}
			if scanErr != nil {
				log.Printf("CLI scan warning: %s (%s): %v", m.Path, m.Type, scanErr)
				return
			}
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
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "No components found in repository"})
	}

	// Deduplicate
	type pkgKey struct{ Name, Version, Ecosystem string }
	uniquePkgs := make(map[pkgKey]scanner.Package)
	for _, p := range allPackages {
		k := pkgKey{p.Name, p.Version, p.Ecosystem}
		if ex, ok := uniquePkgs[k]; ok {
			if p.Depth < ex.Depth {
				uniquePkgs[k] = p
			}
		} else {
			uniquePkgs[k] = p
		}
	}
	allPackages = make([]scanner.Package, 0, len(uniquePkgs))
	ecosystemsMap := make(map[string]bool)
	for _, p := range uniquePkgs {
		allPackages = append(allPackages, p)
		ecosystemsMap[p.Ecosystem] = true
	}

	var ecoList []string
	for e := range ecosystemsMap {
		ecoList = append(ecoList, e)
	}
	ecoStr := strings.Join(ecoList, "+")

	// Vulnerability matching (in-memory, no DB save)
	var crit, high, med, low int
	var activeThreats int
	vulnList := vuln.MatchVulnerabilitiesInMemory(ctx, allPackages)
	for _, v := range vulnList {
		switch v.Severity {
		case "CRITICAL":
			crit++
			activeThreats++
		case "HIGH":
			high++
		case "MEDIUM":
			med++
		case "LOW":
			low++
		}
	}

	// License count
	licMap := make(map[string]bool)
	directCount := 0
	transitiveCount := 0
	for _, p := range allPackages {
		if p.License != "" {
			licMap[p.License] = true
		}
		if p.Depth == 0 {
			directCount++
		} else {
			transitiveCount++
		}
	}

	// NTIA Compliance
	sbomMeta := compliance.SBOMMeta{
		AuthorName:  "SBOM.io",
		AuthorTool:  "sbom-io-scanner v1.0.0",
		GeneratedAt: time.Now(),
		RepoName:    repo,
	}
	ntiaResult := compliance.CheckNTIA(allPackages, sbomMeta)

	complianceStatus := "NON-COMPLIANT"
	if ntiaResult.Score >= 90 {
		complianceStatus = "COMPLIANT"
	} else if ntiaResult.Score >= 60 {
		complianceStatus = "PARTIALLY COMPLIANT"
	}

	// Generate files
	scanInfo := sbom.ScanInfo{
		ID:        keyID, // use key ID as ephemeral scan ID
		RepoName:  owner + "/" + repo,
		RepoURL:   req.GithubURL,
		Ecosystem: ecoStr,
	}

	cdxBytes, _, cdxErr := sbom.GenerateCycloneDX(scanInfo, allPackages, vulnList)
	spdxBytes, _, spdxErr := sbom.GenerateSPDX(scanInfo, allPackages)

	// PDF
	vulnSummary := report.VulnSummary{Critical: crit, High: high, Medium: med, Low: low}
	var vulnDetails []report.VulnDetail
	for i, v := range vulnList {
		if i >= 20 {
			break
		}
		vulnDetails = append(vulnDetails, report.VulnDetail{
			PackageName:    v.ComponentName,
			PackageVersion: v.ComponentVersion,
			CVEID:          v.CVEID,
			Severity:       v.Severity,
			Summary:        v.Summary,
		})
	}
	scanInfoReport := report.ScanInfo{
		ID:          keyID,
		RepoName:    owner + "/" + repo,
		RepoURL:     req.GithubURL,
		Ecosystem:   ecoStr,
		GeneratedAt: time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
	}
	euCompliant := compliance.CheckEUCRA(ntiaResult)
	pdfBytes, pdfErr := report.GeneratePDFReport(scanInfoReport, allPackages, vulnSummary, vulnDetails, ntiaResult, euCompliant)

	// Upload all 3 to storage
	e2Client, storErr := storage.NewE2Client()
	downloads := fiber.Map{}

	if storErr == nil {
		timestamp := time.Now().UTC().Format("20060102150405")
		prefix := fmt.Sprintf("cli/%s/%s", keyID, timestamp)

		if pdfErr == nil {
			pdfKey := prefix + "/report.pdf"
			if err := storage.UploadFile(ctx, e2Client, pdfKey, pdfBytes, "application/pdf"); err == nil {
				if url, err := storage.GetPresignedURL(ctx, e2Client, pdfKey, time.Hour); err == nil {
					downloads["pdf"] = url
				}
			}
		}
		if cdxErr == nil {
			cdxKey := prefix + "/sbom.cyclonedx.json"
			if err := storage.UploadFile(ctx, e2Client, cdxKey, cdxBytes, "application/json"); err == nil {
				if url, err := storage.GetPresignedURL(ctx, e2Client, cdxKey, time.Hour); err == nil {
					downloads["cyclonedx"] = url
				}
			}
		}
		if spdxErr == nil {
			spdxKey := prefix + "/sbom.spdx"
			if err := storage.UploadFile(ctx, e2Client, spdxKey, spdxBytes, "text/spdx"); err == nil {
				if url, err := storage.GetPresignedURL(ctx, e2Client, spdxKey, time.Hour); err == nil {
					downloads["spdx"] = url
				}
			}
		}
	} else {
		log.Printf("CLI scan: storage unavailable: %v", storErr)
	}

	return c.JSON(fiber.Map{
		"status":     "complete",
		"repository": owner + "/" + repo,
		"ecosystem":  ecoStr,
		"stats": fiber.Map{
			"inventory_size": len(allPackages),
			"direct_library": directCount,
			"transitive":     transitiveCount,
			"license_spread": len(licMap),
			"active_threats": activeThreats,
		},
		"vulnerability_summary": fiber.Map{
			"critical": crit,
			"high":     high,
			"medium":   med,
			"low":      low,
		},
		"compliance": fiber.Map{
			"ntia_score": ntiaResult.Score,
			"status":     complianceStatus,
		},
		"downloads": downloads,
	})
}
