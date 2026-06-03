package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"github.com/deptic-io/api/internal/notify"
)

type IntegrationsHandler struct {
	db *sql.DB
}

func NewIntegrationsHandler(db *sql.DB) *IntegrationsHandler {
	return &IntegrationsHandler{db: db}
}

func (h *IntegrationsHandler) RegisterRoutes(api fiber.Router) {
	api.Get("/integrations", h.HandleListIntegrations)
	api.Post("/integrations/slack", h.HandleSaveSlack)
	api.Post("/integrations/jira", h.HandleSaveJira)
	api.Delete("/integrations/:type", h.HandleDeleteIntegration)
	api.Put("/integrations/:type/toggle", h.HandleToggleIntegration)
}

func (h *IntegrationsHandler) HandleListIntegrations(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := h.db.QueryContext(c.Context(), "SELECT type, config, enabled, created_at FROM integrations WHERE user_id = $1", userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch integrations"})
	}
	defer rows.Close()

	var integrations []fiber.Map
	for rows.Next() {
		var t, configStr, createdAt string
		var enabled bool
		if err := rows.Scan(&t, &configStr, &enabled, &createdAt); err == nil {
			var config map[string]interface{}
			json.Unmarshal([]byte(configStr), &config)
			
			// Obfuscate api token
			if t == "jira" && config["api_token"] != nil {
				config["api_token"] = "********"
			}

			integrations = append(integrations, fiber.Map{
				"type":       t,
				"config":     config,
				"enabled":    enabled,
				"created_at": createdAt,
			})
		}
	}
	if integrations == nil {
		integrations = []fiber.Map{}
	}

	return c.JSON(fiber.Map{"integrations": integrations})
}

func (h *IntegrationsHandler) HandleSaveSlack(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	
	var req notify.SlackConfig
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.WebhookURL == "" || req.Channel == "" {
		return c.Status(400).JSON(fiber.Map{"error": "webhook_url and channel are required"})
	}

	configBytes, _ := json.Marshal(req)

	_, err := h.db.ExecContext(c.Context(), `
		INSERT INTO integrations (user_id, type, config) 
		VALUES ($1, 'slack', $2)
		ON CONFLICT (user_id, type) DO UPDATE SET config = EXCLUDED.config, enabled = TRUE
	`, userID, string(configBytes))

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save integration"})
	}

	// Send test message
	msg := notify.SlackMessage{
		Blocks: []interface{}{
			map[string]interface{}{"type": "section", "text": map[string]interface{}{"type": "mrkdwn", "text": "✅ *DEPTIC.io Slack Integration Connected*\nYou will now receive security alerts here."}},
		},
	}
	go notify.SendSlackNotification(context.Background(), req.WebhookURL, msg)

	return c.JSON(fiber.Map{"message": "Slack connected successfully"})
}

func (h *IntegrationsHandler) HandleSaveJira(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	
	var req notify.JiraConfig
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.BaseURL == "" || req.Email == "" || req.ProjectKey == "" {
		return c.Status(400).JSON(fiber.Map{"error": "base_url, email, and project_key are required"})
	}

	if req.APIToken == "" {
		// If api token is empty, try to get existing
		var existingConfigStr string
		err := h.db.QueryRowContext(c.Context(), "SELECT config FROM integrations WHERE user_id = $1 AND type = 'jira'", userID).Scan(&existingConfigStr)
		if err == nil {
			var existingConfig notify.JiraConfig
			json.Unmarshal([]byte(existingConfigStr), &existingConfig)
			req.APIToken = existingConfig.APIToken
		}
	}
	
	if req.APIToken == "" {
		return c.Status(400).JSON(fiber.Map{"error": "api_token is required"})
	}

	configBytes, _ := json.Marshal(req)

	_, err := h.db.ExecContext(c.Context(), `
		INSERT INTO integrations (user_id, type, config) 
		VALUES ($1, 'jira', $2)
		ON CONFLICT (user_id, type) DO UPDATE SET config = EXCLUDED.config, enabled = TRUE
	`, userID, string(configBytes))

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save integration"})
	}

	// Create test ticket
	go func() {
		issue := notify.JiraIssue{}
		issue.Fields.Project = map[string]string{"key": req.ProjectKey}
		issue.Fields.Summary = "[DEPTIC.io] Integration Test Ticket"
		issue.Fields.IssueType = map[string]string{"name": "Bug"}
		issue.Fields.Labels = []string{"deptic-io"}
		issue.Fields.Description = map[string]any{
			"type": "doc", "version": 1,
			"content": []map[string]any{
				{
					"type": "paragraph",
					"content": []map[string]any{
						{"type": "text", "text": "This is a test ticket to verify DEPTIC.io integration."},
					},
				},
			},
		}
		notify.CreateJiraTicket(context.Background(), req, issue)
	}()

	return c.JSON(fiber.Map{"message": "Jira connected successfully"})
}

func (h *IntegrationsHandler) HandleDeleteIntegration(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	t := c.Params("type")

	_, err := h.db.ExecContext(c.Context(), "DELETE FROM integrations WHERE user_id = $1 AND type = $2", userID, t)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete integration"})
	}
	return c.JSON(fiber.Map{"message": "Integration removed"})
}

func (h *IntegrationsHandler) HandleToggleIntegration(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	t := c.Params("type")

	_, err := h.db.ExecContext(c.Context(), "UPDATE integrations SET enabled = NOT enabled WHERE user_id = $1 AND type = $2", userID, t)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to toggle integration"})
	}
	return c.JSON(fiber.Map{"message": "Integration toggled"})
}
