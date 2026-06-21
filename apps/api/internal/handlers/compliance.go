package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/deptic-io/api/internal/compliance"
	"github.com/deptic-io/api/internal/db"
	"github.com/deptic-io/api/internal/scanner"
)

// GetCompliance GET /api/scans/:scanID/compliance
func (h *ScanHandler) GetCompliance(c *fiber.Ctx) error {
	scanID := c.Params("scanID")
	userID := c.Locals("user_id").(string)

	// Verify owner
	var exists bool
	err := h.db.QueryRowContext(c.Context(), `
		SELECT EXISTS (
			SELECT 1 FROM scans sc
			JOIN projects p ON sc.project_id = p.id
			WHERE sc.id = $1 AND p.user_id = $2
		)`, scanID, userID).Scan(&exists)
	if err != nil || !exists {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied"})
	}

	var detailBytes []byte
	var euCompliant bool

	err = h.db.QueryRowContext(c.Context(), `
		SELECT compliance_detail, eu_cra_compliant
		FROM scans
		WHERE id = $1`, scanID).Scan(&detailBytes, &euCompliant)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch compliance detail"})
	}

	if len(detailBytes) == 0 {
		// Fallback for old scans that don't have compliance details saved
		scan, dbComponents, err := db.GetScanWithComponents(c.Context(), h.db, scanID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch components for compliance"})
		}
		var pkgs []scanner.Package
		for _, comp := range dbComponents {
			pkgs = append(pkgs, scanner.Package{
				Name:      comp.Name,
				Version:   comp.Version,
				License:   comp.License,
				Ecosystem: comp.Ecosystem,
				Depth:     comp.Depth,
			})
		}
		depticMeta := compliance.DEPTICMeta{
			AuthorName:  "DEPTIC.io",
			AuthorTool:  "deptic-io-scanner v1.0.0",
			GeneratedAt: scan.CreatedAt,
			RepoName:    "Unknown Repository", // generic for old scans
		}
		
		result := compliance.CheckNTIA(pkgs, depticMeta)
		euCompliant = compliance.CheckEUCRA(result)
		detailBytes, _ = json.Marshal(result)

		// Self-heal: save the calculated compliance back to the DB so it shows up in lists/dashboard
		if err := db.UpdateScanCompliance(c.Context(), h.db, scanID, result.Score, result.Compliant, euCompliant, detailBytes, scan.RepoURL, scan.Ecosystem); err != nil {
			fmt.Printf("Failed to self-heal compliance for %s: %v\n", scanID, err)
		}
		
		var status string
		if result.Score >= 95 {
			status = "COMPLIANT"
		} else if result.Score >= 75 {
			status = "PARTIALLY COMPLIANT"
		} else {
			status = "NON-COMPLIANT"
		}
		
		return c.JSON(fiber.Map{
			"ntia":             result,
			"eu_cra_compliant": euCompliant,
			"status":           status,
		})
	}

	var result compliance.NTIAResult
	if err := json.Unmarshal(detailBytes, &result); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse compliance detail"})
	}

	var status string
	if result.Score >= 95 {
		status = "COMPLIANT"
	} else if result.Score >= 75 {
		status = "PARTIALLY COMPLIANT"
	} else {
		status = "NON-COMPLIANT"
	}

	return c.JSON(fiber.Map{
		"ntia":             result,
		"eu_cra_compliant": euCompliant,
		"status":           status,
	})
}
