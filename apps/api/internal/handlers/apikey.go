package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"math/big"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/deptic-io/api/internal/plans"
	"github.com/deptic-io/api/internal/workspace"
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

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermCreateAPIKey)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	exceeded, _, limit, _ := plans.CheckDailyAPIKeyLimit(c.Context(), h.db, userID)
	if exceeded {
		return c.Status(429).JSON(fiber.Map{
			"error":       "Daily API key limit reached",
			"limit":       limit,
			"remaining":   0,
			"upgrade_url": "/pricing",
		})
	}

	var req createKeyRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	// Generate raw key
	rand40, err := generateRandKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate key"})
	}
	rawKey := "depticio_" + rand40  // 47 chars total
	keyHash := hashKey(rawKey)
	keyPrefix := rawKey[:12] // "depticio_xxxxx"

	var id string
	if wsID != "" {
		err = h.db.QueryRowContext(c.Context(), `
			INSERT INTO api_keys (user_id, workspace_id, name, key_hash, key_prefix)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, userID, wsID, strings.TrimSpace(req.Name), keyHash, keyPrefix).Scan(&id)
	} else {
		err = h.db.QueryRowContext(c.Context(), `
			INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, userID, strings.TrimSpace(req.Name), keyHash, keyPrefix).Scan(&id)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to store key: " + err.Error()})
	}

	plans.IncrementAPIKeyCount(c.Context(), h.db, userID)

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

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermViewScan)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	var rows *sql.Rows
	if wsID != "" {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT id, name, key_prefix, used,
			       to_char(used_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
			       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
			FROM api_keys
			WHERE workspace_id = $1
			ORDER BY created_at DESC
		`, wsID)
	} else {
		rows, err = h.db.QueryContext(c.Context(), `
			SELECT id, name, key_prefix, used,
			       to_char(used_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
			       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
			FROM api_keys
			WHERE user_id = $1 AND workspace_id IS NULL
			ORDER BY created_at DESC
		`, userID)
	}

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

	wsID, err := workspace.VerifyWorkspaceAccess(c, h.db, workspace.PermCreateAPIKey)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	var res sql.Result
	if wsID != "" {
		res, err = h.db.ExecContext(c.Context(), `
			DELETE FROM api_keys WHERE id = $1 AND workspace_id = $2
		`, keyID, wsID)
	} else {
		res, err = h.db.ExecContext(c.Context(), `
			DELETE FROM api_keys WHERE id = $1 AND user_id = $2 AND workspace_id IS NULL
		`, keyID, userID)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete key"})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "key not found"})
	}
	return c.JSON(fiber.Map{"deleted": true})
}

