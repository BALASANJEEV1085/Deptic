package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type WebhookRegistration struct {
	ID                 string    `json:"id"`
	UserID             string    `json:"user_id"`
	WorkspaceID        *string   `json:"workspace_id"`
	RepoOwner          string    `json:"repo_owner"`
	RepoName           string    `json:"repo_name"`
	GithubHookID       int64     `json:"github_hook_id"`
	WebhookSecret      string    `json:"-"`
	Enabled            bool      `json:"enabled"`
	AutoScanBranch     string    `json:"auto_scan_branch"`
	ScanOnAllBranches  bool      `json:"scan_on_all_branches"`
	LastTriggeredAt    *time.Time`json:"last_triggered_at"`
	LastScanID         *string   `json:"last_scan_id"`
	LastEventStatus    *string   `json:"last_event_status"`
	CreatedAt          time.Time `json:"created_at"`
}

type WebhookEvent struct {
	ID         string    `json:"id"`
	WebhookID  string    `json:"webhook_id"`
	EventType  string    `json:"event_type"`
	Branch     string    `json:"branch"`
	CommitSHA  string    `json:"commit_sha"`
	Pusher     string    `json:"pusher"`
	ScanID     *string   `json:"scan_id"`
	Status     string    `json:"status"`
	Payload    string    `json:"payload"`
	ReceivedAt time.Time `json:"received_at"`
}

func CreateWebhookRegistration(ctx context.Context, db *sql.DB, r *WebhookRegistration) (string, error) {
	var id string
	err := db.QueryRowContext(ctx, `
		INSERT INTO webhook_registrations (user_id, workspace_id, repo_owner, repo_name, github_hook_id, webhook_secret, auto_scan_branch, scan_on_all_branches)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, r.UserID, r.WorkspaceID, r.RepoOwner, r.RepoName, r.GithubHookID, r.WebhookSecret, r.AutoScanBranch, r.ScanOnAllBranches).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("CreateWebhookRegistration: %w", err)
	}
	return id, nil
}

func GetWebhookRegistrationByRepo(ctx context.Context, db *sql.DB, owner, repo string) (*WebhookRegistration, error) {
	var r WebhookRegistration
	err := db.QueryRowContext(ctx, `
		SELECT id, user_id, workspace_id, repo_owner, repo_name, github_hook_id, webhook_secret, enabled, auto_scan_branch, scan_on_all_branches, last_triggered_at, last_scan_id, created_at
		FROM webhook_registrations
		WHERE LOWER(repo_owner) = LOWER($1) AND LOWER(repo_name) = LOWER($2)
	`, owner, repo).Scan(&r.ID, &r.UserID, &r.WorkspaceID, &r.RepoOwner, &r.RepoName, &r.GithubHookID, &r.WebhookSecret, &r.Enabled, &r.AutoScanBranch, &r.ScanOnAllBranches, &r.LastTriggeredAt, &r.LastScanID, &r.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("GetWebhookRegistrationByRepo: %w", err)
	}
	return &r, nil
}

func GetWebhookRegistration(ctx context.Context, db *sql.DB, id, userID string) (*WebhookRegistration, error) {
	var r WebhookRegistration
	err := db.QueryRowContext(ctx, `
		SELECT id, user_id, workspace_id, repo_owner, repo_name, github_hook_id, webhook_secret, enabled, auto_scan_branch, scan_on_all_branches, last_triggered_at, last_scan_id, created_at
		FROM webhook_registrations
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(&r.ID, &r.UserID, &r.WorkspaceID, &r.RepoOwner, &r.RepoName, &r.GithubHookID, &r.WebhookSecret, &r.Enabled, &r.AutoScanBranch, &r.ScanOnAllBranches, &r.LastTriggeredAt, &r.LastScanID, &r.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("GetWebhookRegistration: %w", err)
	}
	return &r, nil
}

func GetWebhookRegistrations(ctx context.Context, db *sql.DB, userID string) ([]WebhookRegistration, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT w.id, w.user_id, w.workspace_id, w.repo_owner, w.repo_name, w.github_hook_id, w.webhook_secret, w.enabled, w.auto_scan_branch, w.scan_on_all_branches, w.last_triggered_at, w.last_scan_id, w.created_at, e.status
		FROM webhook_registrations w
		LEFT JOIN LATERAL (
			SELECT status FROM webhook_events WHERE webhook_id = w.id ORDER BY received_at DESC LIMIT 1
		) e ON true
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("GetWebhookRegistrations: %w", err)
	}
	defer rows.Close()

	var results []WebhookRegistration
	for rows.Next() {
		var r WebhookRegistration
		if err := rows.Scan(&r.ID, &r.UserID, &r.WorkspaceID, &r.RepoOwner, &r.RepoName, &r.GithubHookID, &r.WebhookSecret, &r.Enabled, &r.AutoScanBranch, &r.ScanOnAllBranches, &r.LastTriggeredAt, &r.LastScanID, &r.CreatedAt, &r.LastEventStatus); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	if results == nil {
		results = []WebhookRegistration{}
	}
	return results, nil
}

func DeleteWebhookRegistration(ctx context.Context, db *sql.DB, id, userID string) error {
	_, err := db.ExecContext(ctx, "DELETE FROM webhook_registrations WHERE id = $1 AND user_id = $2", id, userID)
	return err
}

func UpdateWebhookRegistrationStatus(ctx context.Context, db *sql.DB, id, userID string, enabled bool) error {
	_, err := db.ExecContext(ctx, "UPDATE webhook_registrations SET enabled = $1 WHERE id = $2 AND user_id = $3", enabled, id, userID)
	return err
}

func CreateWebhookEvent(ctx context.Context, db *sql.DB, e *WebhookEvent) (string, error) {
	var id string
	err := db.QueryRowContext(ctx, `
		INSERT INTO webhook_events (webhook_id, event_type, branch, commit_sha, pusher, status, payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, e.WebhookID, e.EventType, e.Branch, e.CommitSHA, e.Pusher, e.Status, e.Payload).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("CreateWebhookEvent: %w", err)
	}
	return id, nil
}

func UpdateWebhookEvent(ctx context.Context, db *sql.DB, eventID string, scanID string, status string) error {
	_, err := db.ExecContext(ctx, "UPDATE webhook_events SET scan_id = $1, status = $2 WHERE id = $3", scanID, status, eventID)
	return err
}

func UpdateWebhookLastTriggered(ctx context.Context, db *sql.DB, registrationID string, scanID string) error {
	_, err := db.ExecContext(ctx, "UPDATE webhook_registrations SET last_triggered_at = NOW(), last_scan_id = $1 WHERE id = $2", scanID, registrationID)
	return err
}

func GetWebhookEvents(ctx context.Context, db *sql.DB, webhookID string) ([]WebhookEvent, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, webhook_id, event_type, branch, commit_sha, pusher, scan_id, status, received_at
		FROM webhook_events
		WHERE webhook_id = $1
		ORDER BY received_at DESC
		LIMIT 20
	`, webhookID)
	if err != nil {
		return nil, fmt.Errorf("GetWebhookEvents: %w", err)
	}
	defer rows.Close()

	var results []WebhookEvent
	for rows.Next() {
		var e WebhookEvent
		if err := rows.Scan(&e.ID, &e.WebhookID, &e.EventType, &e.Branch, &e.CommitSHA, &e.Pusher, &e.ScanID, &e.Status, &e.ReceivedAt); err != nil {
			return nil, err
		}
		results = append(results, e)
	}
	if results == nil {
		results = []WebhookEvent{}
	}
	return results, nil
}

func CountRecentWebhookScans(ctx context.Context, db *sql.DB, userID string) (int, error) {
	var count int
	err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) 
		FROM scans 
		WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)
		  AND trigger_type = 'webhook' 
		  AND created_at > NOW() - INTERVAL '24 hours'
	`, userID).Scan(&count)
	return count, err
}

// Ensure payload is valid JSON
func marshalPayload(p interface{}) string {
	b, _ := json.Marshal(p)
	return string(b)
}
