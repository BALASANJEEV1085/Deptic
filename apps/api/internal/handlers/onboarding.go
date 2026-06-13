package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/deptic-io/api/internal/db"
)

type OnboardingHandler struct {
	db *sql.DB
}

func NewOnboardingHandler(database *sql.DB) *OnboardingHandler {
	return &OnboardingHandler{db: database}
}

func (h *OnboardingHandler) RegisterRoutes(api fiber.Router) {
	api.Get("/onboarding/status", h.HandleGetStatus)
	api.Post("/onboarding/complete", h.HandleComplete)
	api.Get("/users/profile", h.HandleGetProfile)
	api.Put("/users/profile", h.HandleUpdateProfile)
}

func (h *OnboardingHandler) HandleGetStatus(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	prefs, err := db.GetUserPreferences(c.Context(), h.db, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load onboarding status"})
	}

	isNewUser := computeIsNewUser(prefs)

	resp := fiber.Map{
		"is_new_user":            isNewUser,
		"onboarding_completed":   prefs.OnboardingCompleted,
		"onboarding_skipped":     prefs.OnboardingSkipped,
		"user_created_at":        prefs.UserCreatedAt.Format(time.RFC3339),
		"job_role":               prefs.JobRole,
		"company_name":           prefs.CompanyName,
		"use_case":               prefs.UseCase,
		"heard_about_from":       prefs.HeardAboutFrom,
	}
	return c.JSON(resp)
}

func (h *OnboardingHandler) HandleGetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	prefs, err := db.GetUserPreferences(c.Context(), h.db, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load profile"})
	}

	var fullName sql.NullString
	_ = h.db.QueryRowContext(c.Context(), `
		SELECT COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')
		FROM auth.users WHERE id = $1
	`, userID).Scan(&fullName)

	name := ""
	if fullName.Valid {
		name = fullName.String
	}

	return c.JSON(fiber.Map{
		"full_name":        name,
		"job_role":         prefs.JobRole,
		"company_name":     prefs.CompanyName,
		"use_case":         prefs.UseCase,
		"heard_about_from": prefs.HeardAboutFrom,
	})
}

type completeOnboardingRequest struct {
	FullName       string `json:"full_name"`
	JobRole        string `json:"job_role"`
	CompanyName    string `json:"company_name"`
	HeardAboutFrom string `json:"heard_about_from"`
	UseCase        string `json:"use_case"`
	Skipped        bool   `json:"skipped"`
}

func (h *OnboardingHandler) HandleComplete(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req completeOnboardingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if !req.Skipped && strings.TrimSpace(req.FullName) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Full name is required"})
	}

	if strings.TrimSpace(req.FullName) != "" {
		if err := updateSupabaseUserFullName(userID, strings.TrimSpace(req.FullName)); err != nil {
			fmt.Printf("onboarding: failed to update auth metadata: %v\n", err)
		}
	}

	var heard, role, company, useCase *string
	if s := strings.TrimSpace(req.HeardAboutFrom); s != "" {
		heard = &s
	}
	if s := strings.TrimSpace(req.JobRole); s != "" {
		role = &s
	}
	if s := strings.TrimSpace(req.CompanyName); s != "" {
		company = &s
	}
	if s := strings.TrimSpace(req.UseCase); s != "" {
		useCase = &s
	}

	if err := db.UpsertOnboarding(c.Context(), h.db, userID, req.Skipped, heard, role, company, useCase); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save onboarding"})
	}

	return c.SendStatus(fiber.StatusOK)
}

type updateProfileRequest struct {
	FullName    string `json:"full_name"`
	JobRole     string `json:"job_role"`
	CompanyName string `json:"company_name"`
	Bio         string `json:"bio"`
}

func (h *OnboardingHandler) HandleUpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req updateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if strings.TrimSpace(req.FullName) != "" {
		if err := updateSupabaseUserMetadata(userID, map[string]interface{}{
			"full_name": strings.TrimSpace(req.FullName),
			"bio":       strings.TrimSpace(req.Bio),
		}); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile"})
		}
	} else if strings.TrimSpace(req.Bio) != "" {
		if err := updateSupabaseUserMetadata(userID, map[string]interface{}{
			"bio": strings.TrimSpace(req.Bio),
		}); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile"})
		}
	}

	var role, company *string
	if s := strings.TrimSpace(req.JobRole); s != "" {
		role = &s
	}
	if s := strings.TrimSpace(req.CompanyName); s != "" {
		company = &s
	}

	if err := db.UpdateUserProfile(c.Context(), h.db, userID, role, company); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save preferences"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}

func computeIsNewUser(prefs *db.UserPreferences) bool {
	if prefs.OnboardingCompleted || prefs.OnboardingSkipped {
		return false
	}
	// No preferences row yet (both false from COALESCE) — check account age
	if time.Since(prefs.UserCreatedAt) > 7*24*time.Hour {
		return false
	}
	return true
}

func updateSupabaseUserFullName(userID, fullName string) error {
	return updateSupabaseUserMetadata(userID, map[string]interface{}{"full_name": fullName})
}

func updateSupabaseUserMetadata(userID string, metadata map[string]interface{}) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseURL == "" || serviceKey == "" {
		return fmt.Errorf("supabase admin credentials not configured")
	}

	body, _ := json.Marshal(map[string]interface{}{"user_metadata": metadata})
	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", supabaseURL, userID)
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("supabase admin API returned %d", resp.StatusCode)
	}
	return nil
}
