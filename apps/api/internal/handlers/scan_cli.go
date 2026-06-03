package handlers

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/deptic-io/api/internal/compliance"
	"github.com/deptic-io/api/internal/deptic"
	"github.com/deptic-io/api/internal/report"
	"github.com/deptic-io/api/internal/scanner"
	"github.com/deptic-io/api/internal/storage"
	"github.com/deptic-io/api/internal/vuln"
)

type ManifestUpload struct {
	Filename  string `json:"filename"`
	Path      string `json:"path"`
	Content   string `json:"content"`
	Ecosystem string `json:"ecosystem"`
}

type LocalScanRequest struct {
	APIKey      string           `json:"api_key"`
	ProjectName string           `json:"project_name"`
	Manifests   []ManifestUpload `json:"manifests"`
}

func (h *ScanHandler) ScanLocal(c *fiber.Ctx) error {
	var req LocalScanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.APIKey == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing API key"})
	}

	if len(req.Manifests) == 0 || len(req.Manifests) > 50 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Manifests array must contain between 1 and 50 files"})
	}

	keyHash := hashKey(req.APIKey)

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

	// Mark used immediately
	_, err = h.db.ExecContext(c.Context(), `
		UPDATE api_keys SET used = true, used_at = NOW() WHERE id = $1
	`, keyID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to consume key"})
	}

	// Run scan synchronously
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	var allPackages []scanner.Package
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, m := range req.Manifests {
		if len(m.Content) > 5*1024*1024 {
			continue // Skip >5MB
		}
		
		m := m
		wg.Add(1)
		go func() {
			defer wg.Done()
			var pkgs []scanner.Package
			var scanErr error
			
			switch {
			case strings.Contains(m.Filename, "package.json"):
				pkgs, scanErr = scanner.ScanNPM(ctx, h.rdb, []byte(m.Content))
			case strings.Contains(m.Filename, "requirements.txt") || strings.Contains(m.Filename, "pyproject.toml") || strings.Contains(m.Filename, "setup.py") || strings.Contains(m.Filename, "Pipfile"):
				pkgs, scanErr = scanner.ScanPip(ctx, h.rdb, []byte(m.Content), m.Filename)
			case strings.Contains(m.Filename, "pom.xml"):
				pkgs, scanErr = scanner.ScanMaven(ctx, h.rdb, []byte(m.Content))
			case strings.Contains(m.Filename, "go.mod"):
				pkgs, scanErr = scanner.ScanGoMod(ctx, h.rdb, []byte(m.Content))
			case strings.Contains(m.Filename, "Cargo.toml"):
				// pkgs, scanErr = scanner.ScanCargo(ctx, h.rdb, []byte(m.Content))
			case strings.Contains(m.Filename, "Gemfile"):
				// pkgs, scanErr = scanner.ScanGemfile(ctx, h.rdb, []byte(m.Content))
			}
			
			if scanErr != nil {
				log.Printf("CLI scan warning: %s: %v", m.Path, scanErr)
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

	// Vulnerability matching
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
	depticMeta := compliance.DEPTICMeta{
		AuthorName:  "DEPTIC.io",
		AuthorTool:  "deptic-io-scanner v1.0.0",
		GeneratedAt: time.Now(),
		RepoName:    req.ProjectName,
	}
	ntiaResult := compliance.CheckNTIA(allPackages, depticMeta)

	complianceStatus := "NON-COMPLIANT"
	if ntiaResult.Score >= 90 {
		complianceStatus = "COMPLIANT"
	} else if ntiaResult.Score >= 60 {
		complianceStatus = "PARTIALLY COMPLIANT"
	}

	scanInfo := deptic.ScanInfo{
		ID:        keyID,
		RepoName:  req.ProjectName,
		RepoURL:   "local://" + req.ProjectName,
		Ecosystem: ecoStr,
	}

	cdxBytes, _, cdxErr := deptic.GenerateCycloneDX(scanInfo, allPackages, vulnList)
	spdxBytes, _, spdxErr := deptic.GenerateSPDX(scanInfo, allPackages)

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
		RepoName:    req.ProjectName,
		RepoURL:     "local://" + req.ProjectName,
		Ecosystem:   ecoStr,
		GeneratedAt: time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
	}
	euCompliant := compliance.CheckEUCRA(ntiaResult)
	pdfBytes, pdfErr := report.GeneratePDFReport(scanInfoReport, allPackages, vulnSummary, vulnDetails, ntiaResult, euCompliant)

	// Upload to storage
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
			cdxKey := prefix + "/deptic.cyclonedx.json"
			if err := storage.UploadFile(ctx, e2Client, cdxKey, cdxBytes, "application/json"); err == nil {
				if url, err := storage.GetPresignedURL(ctx, e2Client, cdxKey, time.Hour); err == nil {
					downloads["cyclonedx"] = url
				}
			}
		}
		if spdxErr == nil {
			spdxKey := prefix + "/deptic.spdx"
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
		"repository": req.ProjectName,
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
