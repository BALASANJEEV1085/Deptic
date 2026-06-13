package plans

import (
	"context"
	"database/sql"
	"time"
)

// CheckDailyScanLimit returns error string if limit exceeded, empty string if ok
func CheckDailyScanLimit(ctx context.Context, db *sql.DB, userID string) (bool, int, int, error) {
	plan := GetUserPlan(ctx, db, userID)
	limits := GetLimits(plan)

	// Get today's scan count
	var count int
	db.QueryRowContext(ctx,
		`SELECT COALESCE(scans_count, 0) FROM usage_tracking
     WHERE user_id=$1 AND date=CURRENT_DATE`, userID,
	).Scan(&count)

	remaining := limits.DailyScans - count
	return count >= limits.DailyScans, remaining, limits.DailyScans, nil
}

func IncrementScanCount(ctx context.Context, db *sql.DB, userID string) error {
	_, err := db.ExecContext(ctx, `
    INSERT INTO usage_tracking (user_id, date, scans_count)
    VALUES ($1, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET scans_count = usage_tracking.scans_count + 1
  `, userID)
	return err
}

func CheckDailyAPIKeyLimit(ctx context.Context, db *sql.DB, userID string) (bool, int, int, error) {
	plan := GetUserPlan(ctx, db, userID)
	limits := GetLimits(plan)

	var count int
	db.QueryRowContext(ctx,
		`SELECT COALESCE(api_keys_count, 0) FROM usage_tracking
     WHERE user_id=$1 AND date=CURRENT_DATE`, userID,
	).Scan(&count)

	remaining := limits.DailyAPIKeys - count
	return count >= limits.DailyAPIKeys, remaining, limits.DailyAPIKeys, nil
}

func IncrementAPIKeyCount(ctx context.Context, db *sql.DB, userID string) error {
	_, err := db.ExecContext(ctx, `
    INSERT INTO usage_tracking (user_id, date, api_keys_count)
    VALUES ($1, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET api_keys_count = usage_tracking.api_keys_count + 1
  `, userID)
	return err
}

func CheckWebhookLimit(ctx context.Context, db *sql.DB, userID string) (bool, int, int, error) {
	plan := GetUserPlan(ctx, db, userID)
	limits := GetLimits(plan)

	var count int
	db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM webhook_registrations
     WHERE user_id=$1 AND enabled=true`, userID,
	).Scan(&count)

	remaining := limits.MaxWebhooks - count
	return count >= limits.MaxWebhooks, remaining, limits.MaxWebhooks, nil
}

func CheckWorkspaceLimit(ctx context.Context, db *sql.DB, userID string) (bool, int, int, error) {
	plan := GetUserPlan(ctx, db, userID)
	limits := GetLimits(plan)

	var count int
	db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM workspace_members
     WHERE user_id=$1`, userID,
	).Scan(&count)

	remaining := limits.MaxWorkspaces - count
	return count >= limits.MaxWorkspaces, remaining, limits.MaxWorkspaces, nil
}

func getUserIDFromWebhook(ctx context.Context, db *sql.DB, webhookID string) string {
	var userID string
	db.QueryRowContext(ctx, `SELECT user_id FROM webhook_registrations WHERE id=$1`, webhookID).Scan(&userID)
	return userID
}

func CheckWebhookScanGap(ctx context.Context, db *sql.DB, webhookID string) (bool, error) {
	plan := GetUserPlan(ctx, db, getUserIDFromWebhook(ctx, db, webhookID))
	limits := GetLimits(plan)

	var lastTriggered *time.Time
	db.QueryRowContext(ctx,
		`SELECT last_triggered_at FROM webhook_registrations WHERE id=$1`,
		webhookID,
	).Scan(&lastTriggered)

	if lastTriggered == nil {
		return false, nil
	}
	gapRequired := time.Duration(limits.WebhookScanGapMins) * time.Minute
	tooSoon := time.Since(*lastTriggered) < gapRequired
	return tooSoon, nil
}
