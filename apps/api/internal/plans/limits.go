package plans

import (
	"context"
	"database/sql"
)

type PlanLimits struct {
	DailyScans         int
	MaxWebhooks        int
	WebhookScanGapMins int
	MaxWorkspaces      int
	DailyAPIKeys       int
}

var Limits = map[string]PlanLimits{
	"free": {
		DailyScans:         10,
		MaxWebhooks:        2,
		WebhookScanGapMins: 30,
		MaxWorkspaces:      1,
		DailyAPIKeys:       2,
	},
	"enterprise": {
		DailyScans:         25,
		MaxWebhooks:        5,
		WebhookScanGapMins: 10,
		MaxWorkspaces:      5,
		DailyAPIKeys:       10,
	},
}

func GetLimits(plan string) PlanLimits {
	if l, ok := Limits[plan]; ok {
		return l
	}
	return Limits["free"]
}

func GetUserPlan(ctx context.Context, db *sql.DB, userID string) string {
	var plan string
	err := db.QueryRowContext(ctx,
		`SELECT plan FROM user_subscriptions
     WHERE user_id=$1 AND status='active'
     AND (expires_at IS NULL OR expires_at > NOW())`,
		userID,
	).Scan(&plan)
	if err != nil {
		return "free"
	}
	return plan
}
