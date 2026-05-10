package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/sbom-io/api/internal/compliance"
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
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Compliance details not found for this scan"})
	}

	var result compliance.NTIAResult
	if err := json.Unmarshal(detailBytes, &result); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse compliance detail"})
	}

	return c.JSON(fiber.Map{
		"ntia":             result,
		"eu_cra_compliant": euCompliant,
	})
}
