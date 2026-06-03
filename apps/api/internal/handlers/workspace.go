package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/deptic-io/api/internal/notify"
	"github.com/deptic-io/api/internal/workspace"
)

type WorkspaceHandler struct {
	db *sql.DB
}

func NewWorkspaceHandler(db *sql.DB) *WorkspaceHandler {
	return &WorkspaceHandler{db: db}
}

func (h *WorkspaceHandler) RegisterRoutes(api fiber.Router) {
	// Workspace CRUD
	api.Post("/workspaces", h.HandleCreateWorkspace)
	api.Get("/workspaces", h.HandleListWorkspaces)

	// Workspace-specific routes with WorkspaceAuthMiddleware
	wsGroup := api.Group("/workspaces/:workspaceID", workspace.WorkspaceAuthMiddleware(h.db))
	wsGroup.Get("", h.HandleGetWorkspace)
	wsGroup.Put("", h.HandleUpdateWorkspace)
	wsGroup.Delete("", h.HandleDeleteWorkspace)

	// Members
	wsGroup.Get("/members", h.HandleListMembers)
	wsGroup.Put("/members/:userID/role", h.HandleUpdateMemberRole)
	wsGroup.Delete("/members/:userID", h.HandleRemoveMember)
	wsGroup.Post("/leave", h.HandleLeaveWorkspace)

	// Transfer ownership
	wsGroup.Post("/transfer", h.HandleTransferOwnership)

	// Invitations
	wsGroup.Post("/invite", h.HandleCreateInvitation)
	wsGroup.Get("/invitations", h.HandleListInvitations)
	wsGroup.Delete("/invitations/:inviteID", h.HandleCancelInvitation)

	// Activity log
	wsGroup.Get("/activity", h.HandleGetActivityLog)

	// Workspace-scoped Integrations
	wsGroup.Get("/integrations", h.HandleListWorkspaceIntegrations)
	wsGroup.Post("/integrations/slack", h.HandleSaveWorkspaceSlack)
	wsGroup.Post("/integrations/jira", h.HandleSaveWorkspaceJira)
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: Activity Logging
// ────────────────────────────────────────────────────────────────────────────

func LogWorkspaceActivity(ctx context.Context, db *sql.DB, wsID, userID, action, resType, resID string, metadata interface{}) {
	metaJSON, _ := json.Marshal(metadata)
	_, err := db.ExecContext(ctx, `
		INSERT INTO workspace_activity (workspace_id, user_id, action, resource_type, resource_id, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, wsID, userID, action, resType, resID, string(metaJSON))
	if err != nil {
		fmt.Printf("Error logging workspace activity: %v\n", err)
	}
}

// ────────────────────────────────────────────────────────────────────────────
// Personal Workspace Auto-Creation
// ────────────────────────────────────────────────────────────────────────────

func EnsurePersonalWorkspace(ctx context.Context, db *sql.DB, userID string, email string) error {
	var exists bool
	err := db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM workspace_members WHERE user_id = $1)", userID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	firstName := "User"
	if email != "" {
		parts := strings.Split(email, "@")
		firstName = parts[0]
	}

	workspaceName := fmt.Sprintf("%s's Workspace", strings.Title(firstName))
	baseSlug := strings.ToLower(firstName)
	baseSlug = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(baseSlug, "-")
	baseSlug = strings.Trim(baseSlug, "-")
	if baseSlug == "" {
		baseSlug = "workspace"
	}
	slug := fmt.Sprintf("%s-workspace-%s", baseSlug, randString(4))

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var wsID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO workspaces (id, name, slug, description, owner_id, plan)
		VALUES (gen_random_uuid(), $1, $2, 'Default Personal Workspace', $3, 'free')
		RETURNING id
	`, workspaceName, slug, userID).Scan(&wsID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, wsID, userID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO projects (id, user_id, name, workspace_id, created_at)
		VALUES (gen_random_uuid(), $1, 'Default Project', $2, now())
	`, userID, wsID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO workspace_activity (workspace_id, user_id, action, resource_type, resource_id, metadata)
		VALUES ($1, $2, 'member_joined', 'member', $3, '{"role": "owner", "personal": true}')
	`, wsID, userID, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces
// ────────────────────────────────────────────────────────────────────────────

type createWorkspaceReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (h *WorkspaceHandler) HandleCreateWorkspace(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req createWorkspaceReq
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Workspace name is required"})
	}

	slug, err := h.generateUniqueSlug(c.Context(), req.Name)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate slug"})
	}

	tx, err := h.db.BeginTx(c.Context(), nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Transaction failed"})
	}
	defer tx.Rollback()

	var wsID string
	err = tx.QueryRowContext(c.Context(), `
		INSERT INTO workspaces (id, name, slug, description, owner_id, plan)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, 'free')
		RETURNING id
	`, req.Name, slug, req.Description, userID).Scan(&wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create workspace: " + err.Error()})
	}

	_, err = tx.ExecContext(c.Context(), `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, wsID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to add owner member"})
	}

	// Create default workspace project
	_, err = tx.ExecContext(c.Context(), `
		INSERT INTO projects (id, user_id, name, workspace_id, created_at)
		VALUES (gen_random_uuid(), $1, 'Default Project', $2, now())
	`, userID, wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create default project"})
	}

	// Log activity
	_, _ = tx.ExecContext(c.Context(), `
		INSERT INTO workspace_activity (workspace_id, user_id, action, resource_type, resource_id, metadata)
		VALUES ($1, $2, 'member_joined', 'member', $3, '{"role": "owner"}')
	`, wsID, userID, userID)

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit transaction"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":          wsID,
		"name":        req.Name,
		"slug":        slug,
		"description": req.Description,
		"plan":        "free",
		"role":        "owner",
		"is_personal": false,
		"created_at":  time.Now().UTC().Format(time.RFC3339),
	})
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleListWorkspaces(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := h.db.QueryContext(c.Context(), `
		SELECT w.id, w.name, w.slug, w.description, COALESCE(w.avatar_url, ''), w.plan, wm.role, w.created_at,
		       (w.description = 'Default Personal Workspace') AS is_personal,
		       (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS member_count
		FROM workspaces w
		JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE wm.user_id = $1 AND w.deleted_at IS NULL
		ORDER BY is_personal DESC, w.created_at ASC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch workspaces"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var id, name, slug, desc, avatar, plan, role, createdAt string
		var isPersonal bool
		var memberCount int
		if err := rows.Scan(&id, &name, &slug, &desc, &avatar, &plan, &role, &createdAt, &isPersonal, &memberCount); err == nil {
			list = append(list, fiber.Map{
				"id":           id,
				"name":         name,
				"slug":         slug,
				"description":  desc,
				"avatar_url":   avatar,
				"plan":         plan,
				"role":         role,
				"created_at":   createdAt,
				"is_personal":  isPersonal,
				"member_count": memberCount,
			})
		}
	}

	if list == nil {
		list = []fiber.Map{}
	}

	return c.JSON(fiber.Map{"workspaces": list})
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceID
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleGetWorkspace(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	role := c.Locals("workspace_role").(string)

	var name, slug, desc, avatar, plan string
	var maxMembers, maxScans int
	err := h.db.QueryRowContext(c.Context(), `
		SELECT name, slug, COALESCE(description,''), COALESCE(avatar_url,''), plan, max_members, max_scans_per_month
		FROM workspaces WHERE id = $1 AND deleted_at IS NULL
	`, wsID).Scan(&name, &slug, &desc, &avatar, &plan, &maxMembers, &maxScans)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Workspace not found"})
	}

	var memberCount int
	h.db.QueryRowContext(c.Context(), "SELECT count(*) FROM workspace_members WHERE workspace_id = $1", wsID).Scan(&memberCount)

	var scanCount int
	h.db.QueryRowContext(c.Context(), "SELECT count(*) FROM scans WHERE workspace_id = $1", wsID).Scan(&scanCount)

	return c.JSON(fiber.Map{
		"id":                  wsID,
		"name":                name,
		"slug":                slug,
		"description":         desc,
		"avatar_url":          avatar,
		"plan":                plan,
		"max_members":         maxMembers,
		"max_scans_per_month": maxScans,
		"member_count":        memberCount,
		"scan_count":          scanCount,
		"my_role":             role,
	})
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/workspaces/:workspaceID
// ────────────────────────────────────────────────────────────────────────────

type updateWorkspaceReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatar_url"`
}

func (h *WorkspaceHandler) HandleUpdateWorkspace(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	role := c.Locals("workspace_role").(string)
	userID := c.Locals("user_id").(string)

	if role != string(workspace.RoleOwner) && role != string(workspace.RoleAdmin) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only Owner or Admin can update settings"})
	}

	var req updateWorkspaceReq
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name is required"})
	}

	_, err := h.db.ExecContext(c.Context(), `
		UPDATE workspaces SET name = $1, description = $2, avatar_url = $3, updated_at = NOW()
		WHERE id = $4
	`, req.Name, req.Description, req.AvatarURL, wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update workspace settings"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "workspace_updated", "workspace", wsID, map[string]interface{}{"name": req.Name})

	return c.JSON(fiber.Map{"success": true})
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceID
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleDeleteWorkspace(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	role := c.Locals("workspace_role").(string)
	userID := c.Locals("user_id").(string)

	if role != string(workspace.RoleOwner) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only the Owner can delete this workspace"})
	}

	// Soft delete the workspace
	_, err := h.db.ExecContext(c.Context(), "UPDATE workspaces SET deleted_at = NOW() WHERE id = $1", wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to soft delete workspace"})
	}

	// Cancel all active scans
	_, _ = h.db.ExecContext(c.Context(), "UPDATE scans SET status = 'cancelled' WHERE workspace_id = $1 AND status = 'running'", wsID)

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "workspace_deleted", "workspace", wsID, nil)

	return c.JSON(fiber.Map{"success": true})
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceID/members
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleListMembers(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)

	// Since Supabase manages users under auth.users, we can fetch email and details by joining with auth.users
	rows, err := h.db.QueryContext(c.Context(), `
		SELECT wm.user_id, COALESCE(u.raw_user_meta_data->>'name', u.email) as name, u.email, COALESCE(u.raw_user_meta_data->>'avatar_url', '') as avatar_url, wm.role, wm.joined_at
		FROM workspace_members wm
		JOIN auth.users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1
		ORDER BY wm.joined_at ASC
	`, wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query workspace members: " + err.Error()})
	}
	defer rows.Close()

	var members []fiber.Map
	for rows.Next() {
		var uid, name, email, avatar, role, joinedAt string
		if err := rows.Scan(&uid, &name, &email, &avatar, &role, &joinedAt); err == nil {
			members = append(members, fiber.Map{
				"user_id":    uid,
				"name":       name,
				"email":      email,
				"avatar_url": avatar,
				"role":       role,
				"joined_at":  joinedAt,
			})
		}
	}

	if members == nil {
		members = []fiber.Map{}
	}

	return c.JSON(fiber.Map{"members": members})
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/workspaces/:workspaceID/members/:userID/role
// ────────────────────────────────────────────────────────────────────────────

type updateMemberRoleReq struct {
	Role string `json:"role"`
}

func (h *WorkspaceHandler) HandleUpdateMemberRole(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	myRole := c.Locals("workspace_role").(string)
	myUserID := c.Locals("user_id").(string)
	targetUserID := c.Params("userID")

	if myRole != string(workspace.RoleOwner) && myRole != string(workspace.RoleAdmin) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only Owners or Admins can update roles"})
	}

	var req updateMemberRoleReq
	if err := c.BodyParser(&req); err != nil || (req.Role != "admin" && req.Role != "member" && req.Role != "viewer") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role requested"})
	}

	// Verify target member exists and their current role
	var currentRole string
	err := h.db.QueryRowContext(c.Context(), "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", wsID, targetUserID).Scan(&currentRole)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Member not found"})
	}

	if currentRole == "owner" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Cannot demote the workspace owner"})
	}

	_, err = h.db.ExecContext(c.Context(), "UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3", req.Role, wsID, targetUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update member role"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, myUserID, "member_role_updated", "member", targetUserID, map[string]string{"new_role": req.Role})

	return c.JSON(fiber.Map{"success": true})
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceID/members/:userID
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleRemoveMember(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	myRole := c.Locals("workspace_role").(string)
	myUserID := c.Locals("user_id").(string)
	targetUserID := c.Params("userID")

	if myRole != string(workspace.RoleOwner) && myRole != string(workspace.RoleAdmin) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only Owners or Admins can remove members"})
	}

	var targetRole string
	err := h.db.QueryRowContext(c.Context(), "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", wsID, targetUserID).Scan(&targetRole)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Member not found"})
	}

	if targetRole == "owner" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Cannot remove the workspace owner"})
	}

	if myRole == string(workspace.RoleAdmin) && targetRole == "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Admins cannot remove other Admins"})
	}

	_, err = h.db.ExecContext(c.Context(), "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", wsID, targetUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to remove member"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, myUserID, "member_removed", "member", targetUserID, nil)

	return c.JSON(fiber.Map{"success": true})
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceID/leave
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleLeaveWorkspace(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	role := c.Locals("workspace_role").(string)
	userID := c.Locals("user_id").(string)

	if role == string(workspace.RoleOwner) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Owner cannot leave. You must transfer ownership first."})
	}

	_, err := h.db.ExecContext(c.Context(), "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", wsID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to leave workspace"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "member_left", "member", userID, nil)

	return c.JSON(fiber.Map{"success": true})
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceID/transfer
// ────────────────────────────────────────────────────────────────────────────

type transferOwnershipReq struct {
	NewOwnerID string `json:"new_owner_id"`
}

func (h *WorkspaceHandler) HandleTransferOwnership(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	role := c.Locals("workspace_role").(string)
	userID := c.Locals("user_id").(string)

	if role != string(workspace.RoleOwner) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only the Owner can transfer ownership"})
	}

	var req transferOwnershipReq
	if err := c.BodyParser(&req); err != nil || req.NewOwnerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "new_owner_id is required"})
	}

	// Verify target user is in the workspace
	var targetRole string
	err := h.db.QueryRowContext(c.Context(), "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", wsID, req.NewOwnerID).Scan(&targetRole)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New owner must be an active workspace member"})
	}

	tx, err := h.db.BeginTx(c.Context(), nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to begin transaction"})
	}
	defer tx.Rollback()

	// Update existing owner to admin
	_, err = tx.ExecContext(c.Context(), "UPDATE workspace_members SET role = 'admin' WHERE workspace_id = $1 AND user_id = $2", wsID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update current owner's role"})
	}

	// Update workspaces table owner
	_, err = tx.ExecContext(c.Context(), "UPDATE workspaces SET owner_id = $1 WHERE id = $2", req.NewOwnerID, wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to transfer workspace owner"})
	}

	// Update target to owner
	_, err = tx.ExecContext(c.Context(), "UPDATE workspace_members SET role = 'owner' WHERE workspace_id = $1 AND user_id = $2", wsID, req.NewOwnerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to promote new owner"})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to commit transaction"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "ownership_transferred", "workspace", wsID, map[string]string{"new_owner_id": req.NewOwnerID})

	return c.JSON(fiber.Map{"success": true})
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceID/invite
// ────────────────────────────────────────────────────────────────────────────

type inviteMemberReq struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *WorkspaceHandler) HandleCreateInvitation(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	userID := c.Locals("user_id").(string)

	var req inviteMemberReq
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Email) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email is required"})
	}

	if req.Role != "admin" && req.Role != "member" && req.Role != "viewer" {
		req.Role = "member"
	}

	// Verify plan limit (e.g. max_members limit on free plan)
	var maxMembers int
	h.db.QueryRowContext(c.Context(), "SELECT max_members FROM workspaces WHERE id = $1", wsID).Scan(&maxMembers)
	var activeMembers int
	h.db.QueryRowContext(c.Context(), "SELECT count(*) FROM workspace_members WHERE workspace_id = $1", wsID).Scan(&activeMembers)

	if activeMembers >= maxMembers {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Member limit of %d reached on your current plan", maxMembers)})
	}

	// Verify if the email is already a member of this workspace
	var isMember bool
	err := h.db.QueryRowContext(c.Context(), `
		SELECT EXISTS(
			SELECT 1 FROM workspace_members wm
			JOIN auth.users u ON wm.user_id = u.id
			WHERE wm.workspace_id = $1 AND u.email = $2
		)
	`, wsID, req.Email).Scan(&isMember)
	if err == nil && isMember {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User with this email is already a member of this workspace"})
	}

	// Verify if there is already an active pending invitation for this email
	var isInvited bool
	err = h.db.QueryRowContext(c.Context(), `
		SELECT EXISTS(
			SELECT 1 FROM workspace_invitations
			WHERE workspace_id = $1 AND email = $2 AND accepted = FALSE AND expires_at > NOW()
		)
	`, wsID, req.Email).Scan(&isInvited)
	if err == nil && isInvited {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "An active invitation has already been sent to this email"})
	}

	token := "ws_inv_" + randString(25) // 32-char safe token

	_, err = h.db.ExecContext(c.Context(), `
		INSERT INTO workspace_invitations (workspace_id, email, role, token, invited_by, expires_at)
		VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
	`, wsID, req.Email, req.Role, token, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create invitation: " + err.Error()})
	}

	// Fetch workspace name and inviter name for email
	var workspaceName string
	h.db.QueryRowContext(c.Context(), "SELECT name FROM workspaces WHERE id = $1", wsID).Scan(&workspaceName)
	var inviterName string
	h.db.QueryRowContext(c.Context(), "SELECT COALESCE(raw_user_meta_data->>'name', email) FROM auth.users WHERE id = $1", userID).Scan(&inviterName)

	go func() {
		// Send async Resend email
		err := notify.SendInvitationEmail(context.Background(), req.Email, inviterName, workspaceName, req.Role, token)
		if err != nil {
			fmt.Printf("Error sending invitation email: %v\n", err)
		}
	}()

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "member_invited", "invitation", req.Email, map[string]string{"role": req.Role})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "token": token})
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceID/invitations
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleListInvitations(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)

	rows, err := h.db.QueryContext(c.Context(), `
		SELECT id, email, role, invited_by, created_at, expires_at
		FROM workspace_invitations
		WHERE workspace_id = $1 AND accepted = FALSE AND expires_at > NOW()
		ORDER BY created_at DESC
	`, wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch invitations"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var id, email, role, invitedBy, createdAt, expiresAt string
		if err := rows.Scan(&id, &email, &role, &invitedBy, &createdAt, &expiresAt); err == nil {
			list = append(list, fiber.Map{
				"id":         id,
				"email":      email,
				"role":       role,
				"invited_by": invitedBy,
				"created_at": createdAt,
				"expires_at": expiresAt,
			})
		}
	}

	if list == nil {
		list = []fiber.Map{}
	}

	return c.JSON(fiber.Map{"invitations": list})
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceID/invitations/:inviteID
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleCancelInvitation(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	inviteID := c.Params("inviteID")
	userID := c.Locals("user_id").(string)

	res, err := h.db.ExecContext(c.Context(), "DELETE FROM workspace_invitations WHERE id = $1 AND workspace_id = $2", inviteID, wsID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to cancel invitation"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invitation not found"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "member_invite_cancelled", "invitation", inviteID, nil)

	return c.JSON(fiber.Map{"success": true})
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/invite/:token (Public)
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleGetInvitationPublic(c *fiber.Ctx) error {
	token := c.Params("token")

	var wsName, inviterName, email, role string
	var expiresAt time.Time

	err := h.db.QueryRowContext(c.Context(), `
		SELECT w.name, COALESCE(u.raw_user_meta_data->>'name', u.email) as inviter_name, i.email, i.role, i.expires_at
		FROM workspace_invitations i
		JOIN workspaces w ON i.workspace_id = w.id
		JOIN auth.users u ON i.invited_by = u.id
		WHERE i.token = $1
	`, token).Scan(&wsName, &inviterName, &email, &role, &expiresAt)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid invitation token"})
	}

	if time.Now().After(expiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invitation has expired"})
	}

	return c.JSON(fiber.Map{
		"workspace_name":  wsName,
		"invited_by_name": inviterName,
		"email":           email,
		"role":            role,
		"expires_at":      expiresAt,
	})
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/invite/:token/accept (JWT-protected)
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleAcceptInvitation(c *fiber.Ctx) error {
	token := c.Params("token")
	userID := c.Locals("user_id").(string)

	var wsID, role string
	var expiresAt time.Time
	err := h.db.QueryRowContext(c.Context(), `
		SELECT workspace_id, role, expires_at
		FROM workspace_invitations WHERE token = $1
	`, token).Scan(&wsID, &role, &expiresAt)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid invitation token"})
	}

	if time.Now().After(expiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invitation has expired"})
	}

	tx, err := h.db.BeginTx(c.Context(), nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to begin transaction"})
	}
	defer tx.Rollback()

	// Insert or update member (idempotent - link is reusable)
	_, err = tx.ExecContext(c.Context(), `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`, wsID, userID, role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to join workspace: " + err.Error()})
	}

	// Log activity
	_, _ = tx.ExecContext(c.Context(), `
		INSERT INTO workspace_activity (workspace_id, user_id, action, resource_type, resource_id, metadata)
		VALUES ($1, $2, 'member_joined', 'member', $3, '{"accepted_invite": true}')
	`, wsID, userID, userID)

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Transaction commit failed"})
	}

	// Notify workspace owners + admins
	go func() {
		// Find all owners + admins to notify
		rows, err := h.db.QueryContext(context.Background(), `
			SELECT u.email FROM workspace_members wm
			JOIN auth.users u ON wm.user_id = u.id
			WHERE wm.workspace_id = $1 AND wm.role IN ('owner', 'admin')
		`, wsID)
		if err == nil {
			defer rows.Close()
			var newMemberName string
			h.db.QueryRowContext(context.Background(), "SELECT COALESCE(raw_user_meta_data->>'name', email) FROM auth.users WHERE id = $1", userID).Scan(&newMemberName)
			var wsName string
			h.db.QueryRowContext(context.Background(), "SELECT name FROM workspaces WHERE id = $1", wsID).Scan(&wsName)

			for rows.Next() {
				var email string
				if err := rows.Scan(&email); err == nil {
					notify.SendEmail(context.Background(), email, "New member joined your workspace", fmt.Sprintf("<p><strong>%s</strong> accepted the invitation and joined the <strong>%s</strong> workspace.</p>", newMemberName, wsName))
				}
			}
		}
	}()

	return c.JSON(fiber.Map{"success": true, "workspace_id": wsID})
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceID/activity
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleGetActivityLog(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)

	actionFilter := c.Query("action")

	var rows *sql.Rows
	var err error
	if actionFilter != "" {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT wa.id, wa.workspace_id, wa.user_id, COALESCE(u.raw_user_meta_data->>'name', u.email) as user_name,
			       wa.action, COALESCE(wa.resource_type,''), COALESCE(wa.resource_id,''), wa.metadata, wa.created_at
			FROM workspace_activity wa
			LEFT JOIN auth.users u ON wa.user_id = u.id
			WHERE wa.workspace_id = $1 AND wa.action = $2
			ORDER BY wa.created_at DESC
			LIMIT 50
		`, wsID, actionFilter)
	} else {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT wa.id, wa.workspace_id, wa.user_id, COALESCE(u.raw_user_meta_data->>'name', u.email) as user_name,
			       wa.action, COALESCE(wa.resource_type,''), COALESCE(wa.resource_id,''), wa.metadata, wa.created_at
			FROM workspace_activity wa
			LEFT JOIN auth.users u ON wa.user_id = u.id
			WHERE wa.workspace_id = $1
			ORDER BY wa.created_at DESC
			LIMIT 50
		`, wsID)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch activity log"})
	}
	defer rows.Close()

	var logs []fiber.Map
	for rows.Next() {
		var id, workspaceID, userID, userName, action, resType, resID, metadataStr, createdAt string
		if err := rows.Scan(&id, &workspaceID, &userID, &userName, &action, &resType, &resID, &metadataStr, &createdAt); err == nil {
			var metadata map[string]interface{}
			json.Unmarshal([]byte(metadataStr), &metadata)

			logs = append(logs, fiber.Map{
				"id":            id,
				"workspace_id":  workspaceID,
				"user_id":       userID,
				"user_name":     userName,
				"action":        action,
				"resource_type": resType,
				"resource_id":   resID,
				"metadata":      metadata,
				"created_at":    createdAt,
			})
		}
	}

	if logs == nil {
		logs = []fiber.Map{}
	}

	return c.JSON(logs)
}

// ────────────────────────────────────────────────────────────────────────────
// Workspace Scoped Integrations Handlers
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) HandleListWorkspaceIntegrations(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)

	rows, err := h.db.QueryContext(c.Context(), "SELECT type, config, enabled, created_at FROM integrations WHERE workspace_id = $1", wsID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch workspace integrations"})
	}
	defer rows.Close()

	var integrations []fiber.Map
	for rows.Next() {
		var t, configStr, createdAt string
		var enabled bool
		if err := rows.Scan(&t, &configStr, &enabled, &createdAt); err == nil {
			var config map[string]interface{}
			json.Unmarshal([]byte(configStr), &config)

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

func (h *WorkspaceHandler) HandleSaveWorkspaceSlack(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	userID := c.Locals("user_id").(string)

	var req notify.SlackConfig
	if err := c.BodyParser(&req); err != nil || req.WebhookURL == "" || req.Channel == "" {
		return c.Status(400).JSON(fiber.Map{"error": "webhook_url and channel are required"})
	}

	configBytes, _ := json.Marshal(req)

	_, err := h.db.ExecContext(c.Context(), `
		INSERT INTO integrations (workspace_id, type, config) 
		VALUES ($1, 'slack', $2)
		ON CONFLICT (workspace_id, type) DO UPDATE SET config = EXCLUDED.config, enabled = TRUE
	`, wsID, string(configBytes))

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save integration"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "integration_connected", "integration", "slack", nil)

	// Send verification Slack message
	msg := notify.SlackMessage{
		Blocks: []interface{}{
			map[string]interface{}{"type": "section", "text": map[string]interface{}{"type": "mrkdwn", "text": "✅ *DEPTIC.io Slack Integration Connected for Workspace*\nYou will now receive workspace security alerts here."}},
		},
	}
	go notify.SendSlackNotification(context.Background(), req.WebhookURL, msg)

	return c.JSON(fiber.Map{"message": "Slack connected successfully"})
}

func (h *WorkspaceHandler) HandleSaveWorkspaceJira(c *fiber.Ctx) error {
	wsID := c.Locals("workspace_id").(string)
	userID := c.Locals("user_id").(string)

	var req notify.JiraConfig
	if err := c.BodyParser(&req); err != nil || req.BaseURL == "" || req.Email == "" || req.ProjectKey == "" {
		return c.Status(400).JSON(fiber.Map{"error": "base_url, email, and project_key are required"})
	}

	if req.APIToken == "" {
		var existingConfigStr string
		err := h.db.QueryRowContext(c.Context(), "SELECT config FROM integrations WHERE workspace_id = $1 AND type = 'jira'", wsID).Scan(&existingConfigStr)
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
		INSERT INTO integrations (workspace_id, type, config) 
		VALUES ($1, 'jira', $2)
		ON CONFLICT (workspace_id, type) DO UPDATE SET config = EXCLUDED.config, enabled = TRUE
	`, wsID, string(configBytes))

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save integration"})
	}

	LogWorkspaceActivity(c.Context(), h.db, wsID, userID, "integration_connected", "integration", "jira", nil)

	return c.JSON(fiber.Map{"message": "Jira connected successfully"})
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers: Slug generation
// ────────────────────────────────────────────────────────────────────────────

func (h *WorkspaceHandler) generateUniqueSlug(ctx context.Context, name string) (string, error) {
	baseSlug := strings.ToLower(strings.TrimSpace(name))
	baseSlug = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(baseSlug, "-")
	baseSlug = strings.Trim(baseSlug, "-")
	if baseSlug == "" {
		baseSlug = "workspace"
	}

	slug := baseSlug
	for {
		var exists bool
		err := h.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM workspaces WHERE slug = $1)", slug).Scan(&exists)
		if err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%s", baseSlug, randString(4))
	}
}

func randString(n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		b[i] = chars[num.Int64()]
	}
	return string(b)
}
