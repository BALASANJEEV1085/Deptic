package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
)

// HandleDeleteAccount handles DELETE /api/account
// Performs all cleanup steps then deletes the user from auth.users
func (h *ScanHandler) HandleDeleteAccount(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	fmt.Printf("DeleteAccount: starting cleanup for user %s\n", userID)

	// Step 1: Delete all webhook registrations
	if _, err := h.db.ExecContext(ctx, `DELETE FROM webhook_registrations WHERE user_id = $1`, userID); err != nil {
		fmt.Printf("DeleteAccount: warning deleting webhook_registrations: %v\n", err)
	}

	// Step 2: Delete all API keys
	if _, err := h.db.ExecContext(ctx, `DELETE FROM api_keys WHERE user_id = $1`, userID); err != nil {
		fmt.Printf("DeleteAccount: warning deleting api_keys: %v\n", err)
	}

	// Step 3: Delete all workspace memberships (not ownership)
	if _, err := h.db.ExecContext(ctx, `DELETE FROM workspace_members WHERE user_id = $1`, userID); err != nil {
		fmt.Printf("DeleteAccount: warning deleting workspace_members: %v\n", err)
	}

	// Step 4: Handle workspaces owned by this user
	rows, err := h.db.QueryContext(ctx, `SELECT id, name FROM workspaces WHERE owner_id = $1`, userID)
	if err != nil {
		fmt.Printf("DeleteAccount: warning listing workspaces: %v\n", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var wsID, wsName string
			if err := rows.Scan(&wsID, &wsName); err != nil {
				continue
			}

			// Try to find another admin
			var newOwner sql.NullString
			h.db.QueryRowContext(ctx, `
				SELECT user_id FROM workspace_members 
				WHERE workspace_id = $1 AND role = 'admin' AND user_id != $2
				ORDER BY created_at ASC LIMIT 1
			`, wsID, userID).Scan(&newOwner)

			if newOwner.Valid && newOwner.String != "" {
				// Transfer ownership to admin
				h.db.ExecContext(ctx, `UPDATE workspaces SET owner_id = $1 WHERE id = $2`, newOwner.String, wsID)
				fmt.Printf("DeleteAccount: transferred workspace %s to admin %s\n", wsID, newOwner.String)
			} else {
				// Try any other member
				h.db.QueryRowContext(ctx, `
					SELECT user_id FROM workspace_members 
					WHERE workspace_id = $1 AND user_id != $2
					ORDER BY created_at ASC LIMIT 1
				`, wsID, userID).Scan(&newOwner)

				if newOwner.Valid && newOwner.String != "" {
					// Promote oldest member
					h.db.ExecContext(ctx, `UPDATE workspaces SET owner_id = $1 WHERE id = $2`, newOwner.String, wsID)
					h.db.ExecContext(ctx, `UPDATE workspace_members SET role = 'admin' WHERE workspace_id = $1 AND user_id = $2`, wsID, newOwner.String)
					fmt.Printf("DeleteAccount: promoted member %s to owner of workspace %s\n", newOwner.String, wsID)
				} else {
					// No members, delete workspace entirely
					h.db.ExecContext(ctx, `DELETE FROM workspaces WHERE id = $1`, wsID)
					fmt.Printf("DeleteAccount: deleted workspace %s (no members)\n", wsID)
				}
			}
		}
	}

	// Step 5: Delete personal workspace
	if _, err := h.db.ExecContext(ctx, `DELETE FROM workspaces WHERE owner_id = $1 AND name LIKE '%Personal%'`, userID); err != nil {
		fmt.Printf("DeleteAccount: warning deleting personal workspace: %v\n", err)
	}

	// Step 6: Delete remaining workspaces still owned by user
	if _, err := h.db.ExecContext(ctx, `DELETE FROM workspaces WHERE owner_id = $1`, userID); err != nil {
		fmt.Printf("DeleteAccount: warning deleting remaining workspaces: %v\n", err)
	}

	// Step 7: Delete the auth user via Supabase Admin API
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")

	if supabaseURL != "" && serviceKey != "" {
		deleteURL := fmt.Sprintf("%s/auth/v1/admin/users/%s", supabaseURL, userID)
		req, err := http.NewRequest(http.MethodDelete, deleteURL, nil)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create delete request"})
		}
		req.Header.Set("Authorization", "Bearer "+serviceKey)
		req.Header.Set("apikey", serviceKey)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete auth user"})
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
			fmt.Printf("DeleteAccount: Supabase admin delete returned %d\n", resp.StatusCode)
			// Fallback: try direct DB delete
			if _, err := h.db.ExecContext(ctx, `DELETE FROM auth.users WHERE id = $1`, userID); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to delete user: %v", err)})
			}
		}
	} else {
		// Fallback: direct DB delete
		if _, err := h.db.ExecContext(ctx, `DELETE FROM auth.users WHERE id = $1`, userID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to delete user: %v", err)})
		}
	}

	fmt.Printf("DeleteAccount: successfully deleted user %s\n", userID)
	return c.JSON(fiber.Map{"status": "deleted"})
}
