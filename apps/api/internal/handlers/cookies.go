package handlers

import (
	"github.com/gofiber/fiber/v2"
)

type cookieConsentReq struct {
	Analytics bool   `json:"analytics"`
	Marketing bool   `json:"marketing"`
	SessionID string `json:"session_id"`
}

func (h *ScanHandler) SaveCookieConsent(c *fiber.Ctx) error {
	var req cookieConsentReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	_, err := h.db.ExecContext(c.Context(), `
		INSERT INTO cookie_consents (session_id, analytics, marketing, necessary, ip_address, user_agent)
		VALUES ($1, $2, $3, true, $4, $5)
	`, req.SessionID, req.Analytics, req.Marketing, ipAddress, userAgent)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save consent"})
	}

	return c.SendStatus(fiber.StatusOK)
}
