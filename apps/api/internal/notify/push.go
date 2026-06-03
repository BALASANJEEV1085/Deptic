package notify

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"time"

	"github.com/google/uuid"
	webpush "github.com/SherClockHolmes/webpush-go"
)

type PushPayload struct {
	Title              string            `json:"title"`
	Body               string            `json:"body"`
	Icon               string            `json:"icon"`
	Badge              string            `json:"badge"`
	URL                string            `json:"url"`
	Tag                string            `json:"tag"`
	Type               string            `json:"type"`
	NotificationID     string            `json:"notificationId"`
	RequireInteraction bool              `json:"requireInteraction"`
	Actions            []PushAction      `json:"actions,omitempty"`
	Data               map[string]string `json:"data,omitempty"`
	Vibrate            []int             `json:"vibrate,omitempty"`
	Timestamp          int64             `json:"timestamp"`
	Silent             bool              `json:"silent,omitempty"`
}

type PushAction struct {
	Action string `json:"action"`
	Title  string `json:"title"`
	Icon   string `json:"icon,omitempty"`
}

func SendPushToUser(ctx context.Context, db *sql.DB, userID string, payload PushPayload) error {
	// Set defaults
	if payload.Icon == "" {
		payload.Icon = "https://deptic.in/icon-192.png"
	}
	if payload.Badge == "" {
		payload.Badge = "https://deptic.in/badge-72.png"
	}
	payload.Timestamp = time.Now().UnixMilli()

	// Log notification to DB
	notifID := uuid.New().String()
	payload.NotificationID = notifID
	db.ExecContext(ctx,
		`INSERT INTO notification_log (id, user_id, type, title, body, url, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		notifID, userID, payload.Type, payload.Title, payload.Body, payload.URL,
		payload.Data,
	)

	// Get all subscriptions for this user
	rows, err := db.QueryContext(ctx,
		`SELECT endpoint, p256dh, auth FROM push_subscriptions
     WHERE user_id=$1 AND enabled=true`, userID)
	if err != nil {
		return err
	}
	defer rows.Close()

	payloadBytes, _ := json.Marshal(payload)

	for rows.Next() {
		var endpoint, p256dh, auth string
		rows.Scan(&endpoint, &p256dh, &auth)

		sub := &webpush.Subscription{
			Endpoint: endpoint,
			Keys: webpush.Keys{P256dh: p256dh, Auth: auth},
		}

		resp, err := webpush.SendNotification(payloadBytes, sub, &webpush.Options{
			VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
			VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
			Subscriber:      os.Getenv("VAPID_EMAIL"),
			TTL:             86400, // 24 hours
			Urgency:         webpush.UrgencyNormal,
		})

		if err != nil || (resp != nil && resp.StatusCode >= 400) {
			// If 410 Gone: subscription expired, remove it
			if resp != nil && resp.StatusCode == 410 {
				db.ExecContext(ctx, `DELETE FROM push_subscriptions WHERE endpoint=$1`, endpoint)
			}
			continue
		}
		// Update last_used_at
		db.ExecContext(ctx, `UPDATE push_subscriptions SET last_used_at=NOW() WHERE endpoint=$1`, endpoint)
	}

	return nil
}
