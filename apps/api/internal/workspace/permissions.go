package workspace

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type Role string

const (
	RoleOwner  Role = "owner"
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
	RoleViewer Role = "viewer"
)

type Permission string

const (
	PermCreateScan         Permission = "scan:create"
	PermDeleteScan         Permission = "scan:delete"
	PermViewScan           Permission = "scan:view"
	PermCreateFixPR        Permission = "fixpr:create"
	PermManageMembers      Permission = "members:manage"
	PermInviteMembers      Permission = "members:invite"
	PermManageIntegrations Permission = "integrations:manage"
	PermViewIntegrations   Permission = "integrations:view"
	PermManageWorkspace    Permission = "workspace:manage"
	PermDeleteWorkspace    Permission = "workspace:delete"
	PermExportSBOM         Permission = "sbom:export"
	PermCreateAPIKey       Permission = "apikey:create"
)

var RolePermissions = map[Role][]Permission{
	RoleOwner: {
		PermCreateScan, PermDeleteScan, PermViewScan, PermCreateFixPR,
		PermManageMembers, PermInviteMembers, PermManageIntegrations, PermViewIntegrations,
		PermManageWorkspace, PermDeleteWorkspace, PermExportSBOM, PermCreateAPIKey,
	},
	RoleAdmin: {
		PermCreateScan, PermDeleteScan, PermViewScan, PermCreateFixPR,
		PermManageMembers, PermInviteMembers, PermManageIntegrations, PermViewIntegrations,
		PermExportSBOM, PermCreateAPIKey,
	},
	RoleMember: {
		PermCreateScan, PermViewScan, PermCreateFixPR, PermExportSBOM, PermViewIntegrations,
	},
	RoleViewer: {
		PermViewScan,
	},
}

func HasPermission(role Role, perm Permission) bool {
	perms, ok := RolePermissions[role]
	if !ok {
		return false
	}
	for _, p := range perms {
		if p == perm {
			return true
		}
	}
	return false
}

func GetMemberRole(ctx context.Context, db *sql.DB, workspaceID, userID string) (Role, error) {
	var role string
	err := db.QueryRowContext(ctx, "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2", workspaceID, userID).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("user is not a member of this workspace")
		}
		return "", err
	}
	return Role(role), nil
}

func RequirePermission(ctx context.Context, db *sql.DB, workspaceID, userID string, perm Permission) error {
	role, err := GetMemberRole(ctx, db, workspaceID, userID)
	if err != nil {
		return err
	}
	if !HasPermission(role, perm) {
		return fmt.Errorf("insufficient permission: requires %s", perm)
	}
	return nil
}

// WorkspaceAuthMiddleware checks if user is a member of the workspace and attaches role/workspace details to context
func WorkspaceAuthMiddleware(db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}

		workspaceID := c.Params("workspaceID")
		if workspaceID == "" {
			workspaceID = c.Get("X-Workspace-ID")
		}

		// Optional fallback to JWT claim
		if workspaceID == "" {
			authHeader := c.Get("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				tokenString := strings.TrimPrefix(authHeader, "Bearer ")
				token, _, _ := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
				if token != nil {
					if claims, ok := token.Claims.(jwt.MapClaims); ok {
						if wsID, exists := claims["workspace_id"].(string); exists {
							workspaceID = wsID
						}
					}
				}
			}
		}

		if workspaceID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Workspace ID is required"})
		}

		role, err := GetMemberRole(c.Context(), db, workspaceID, userID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied: " + err.Error()})
		}

		c.Locals("workspace_id", workspaceID)
		c.Locals("workspace_role", string(role))
		return c.Next()
	}
}

// VerifyWorkspaceAccess is a helper that checks access when workspaces are optional (X-Workspace-ID header)
func VerifyWorkspaceAccess(c *fiber.Ctx, db *sql.DB, perm Permission) (string, error) {
	wsID := c.Get("X-Workspace-ID")
	if wsID == "" {
		return "", nil // Scoped to personal account
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return "", fmt.Errorf("unauthorized")
	}
	role, err := GetMemberRole(c.Context(), db, wsID, userID)
	if err != nil {
		return "", err
	}
	if perm != "" && !HasPermission(role, perm) {
		return "", fmt.Errorf("insufficient permission: requires %s", perm)
	}
	return wsID, nil
}
