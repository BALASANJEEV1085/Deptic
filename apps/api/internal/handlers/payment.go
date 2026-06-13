package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	razorpay "github.com/razorpay/razorpay-go"
	"github.com/deptic-io/api/internal/plans"
)

func (h *ScanHandler) CreatePaymentOrder(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	client := razorpay.NewClient(
		os.Getenv("RAZORPAY_KEY_ID"),
		os.Getenv("RAZORPAY_KEY_SECRET"),
	)

	// Amount: 999 INR = 99900 paise
	data := map[string]interface{}{
		"amount":   99900,
		"currency": "INR",
		"receipt":  "deptic_enterprise_" + userID[:8] + "_" + strconv.FormatInt(time.Now().Unix(), 10),
		"notes": map[string]interface{}{
			"user_id": userID,
			"plan":    "enterprise",
			"product": "Deptic Enterprise Monthly",
		},
	}

	order, err := client.Order.Create(data, nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create payment order"})
	}

	// Save pending order to DB
	_, _ = h.db.ExecContext(c.Context(), `
    INSERT INTO user_subscriptions (user_id, plan, razorpay_order_id, status, amount_paid, currency)
    VALUES ($1, 'enterprise', $2, 'pending', 99900, 'INR')
    ON CONFLICT (user_id) DO UPDATE SET
      razorpay_order_id=$2, status='pending', updated_at=NOW()
  `, userID, order["id"])

	var userEmail string
	_ = h.db.QueryRowContext(c.Context(), `SELECT email FROM auth.users WHERE id=$1`, userID).Scan(&userEmail)
	
	// Assuming email parsing for name
	userName := "User"

	return c.JSON(fiber.Map{
		"order_id":   order["id"],
		"amount":     99900,
		"currency":   "INR",
		"key_id":     os.Getenv("RAZORPAY_KEY_ID"),
		"user_email": userEmail,
		"user_name":  userName,
	})
}

func (h *ScanHandler) VerifyPayment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	type VerifyRequest struct {
		RazorpayOrderID   string `json:"razorpay_order_id"`
		RazorpayPaymentID string `json:"razorpay_payment_id"`
		RazorpaySignature string `json:"razorpay_signature"`
	}

	var req VerifyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	message := req.RazorpayOrderID + "|" + req.RazorpayPaymentID
	mac := hmac.New(sha256.New, []byte(os.Getenv("RAZORPAY_KEY_SECRET")))
	mac.Write([]byte(message))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expectedSig), []byte(req.RazorpaySignature)) {
		log.Printf("PAYMENT FRAUD ATTEMPT: userID=%s orderID=%s", userID, req.RazorpayOrderID)
		return c.Status(400).JSON(fiber.Map{"error": "Payment verification failed — invalid signature"})
	}

	client := razorpay.NewClient(os.Getenv("RAZORPAY_KEY_ID"), os.Getenv("RAZORPAY_KEY_SECRET"))
	payment, err := client.Payment.Fetch(req.RazorpayPaymentID, nil, nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not verify payment with Razorpay"})
	}

	if payment["status"] != "captured" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Payment not captured. Status: " + payment["status"].(string),
		})
	}

	if int(payment["amount"].(float64)) != 99900 {
		return c.Status(400).JSON(fiber.Map{"error": "Payment amount mismatch"})
	}

	if notes, ok := payment["notes"].(map[string]interface{}); ok {
		if notes["user_id"] != userID {
			log.Printf("PAYMENT USER MISMATCH: expected=%s got=%s", userID, notes["user_id"])
			return c.Status(400).JSON(fiber.Map{"error": "Payment user mismatch"})
		}
	}

	expiresAt := time.Now().AddDate(0, 1, 0) // 1 month
	_, err = h.db.ExecContext(c.Context(), `
    INSERT INTO user_subscriptions
      (user_id, plan, razorpay_payment_id, razorpay_order_id, status, amount_paid, currency, started_at, expires_at)
    VALUES ($1, 'enterprise', $2, $3, 'active', 99900, 'INR', NOW(), $4)
    ON CONFLICT (user_id) DO UPDATE SET
      plan='enterprise',
      razorpay_payment_id=$2,
      razorpay_order_id=$3,
      status='active',
      amount_paid=99900,
      started_at=NOW(),
      expires_at=$4,
      updated_at=NOW()
  `, userID, req.RazorpayPaymentID, req.RazorpayOrderID, expiresAt)

	if err != nil {
		log.Printf("CRITICAL: Payment verified but DB update failed: %v", err)
		time.Sleep(500 * time.Millisecond)
		h.db.ExecContext(c.Context(), `UPDATE user_subscriptions SET plan='enterprise', status='active', expires_at=$2, updated_at=NOW() WHERE user_id=$1`, userID, expiresAt)
	}

	log.Printf("Enterprise plan granted: userID=%s paymentID=%s", userID, req.RazorpayPaymentID)

	return c.JSON(fiber.Map{
		"success":    true,
		"plan":       "enterprise",
		"expires_at": expiresAt,
		"message":    "Enterprise plan activated successfully",
	})
}

func (h *ScanHandler) RazorpayWebhook(c *fiber.Ctx) error {
	payload := c.Body()
	signature := c.Get("X-Razorpay-Signature")

	mac := hmac.New(sha256.New, []byte(os.Getenv("RAZORPAY_WEBHOOK_SECRET")))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid webhook signature"})
	}

	var event map[string]interface{}
	json.Unmarshal(payload, &event)

	eventType := event["event"].(string)

	switch eventType {
	case "payment.captured":
		paymentEntity := event["payload"].(map[string]interface{})["payment"].(map[string]interface{})["entity"].(map[string]interface{})
		paymentID := paymentEntity["id"].(string)
		notes := paymentEntity["notes"].(map[string]interface{})
		userID := notes["user_id"].(string)

		expiresAt := time.Now().AddDate(0, 1, 0)
		h.db.ExecContext(c.Context(), `
      UPDATE user_subscriptions SET
        plan='enterprise', status='active',
        razorpay_payment_id=$2, expires_at=$3, updated_at=NOW()
      WHERE user_id=$1
    `, userID, paymentID, expiresAt)

		log.Printf("Webhook: Enterprise activated for userID=%s", userID)

	case "payment.failed":
		paymentEntity := event["payload"].(map[string]interface{})["payment"].(map[string]interface{})["entity"].(map[string]interface{})
		notes := paymentEntity["notes"].(map[string]interface{})
		userID := notes["user_id"].(string)
		h.db.ExecContext(c.Context(), `UPDATE user_subscriptions SET status='pending', updated_at=NOW() WHERE user_id=$1`, userID)
	}

	return c.SendStatus(200)
}

func (h *ScanHandler) GetPaymentStatus(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	plan := plans.GetUserPlan(c.Context(), h.db, userID)

	var scansToday, apiKeysToday int
	h.db.QueryRowContext(c.Context(), `SELECT COALESCE(scans_count,0), COALESCE(api_keys_count,0) FROM usage_tracking WHERE user_id=$1 AND date=CURRENT_DATE`, userID).Scan(&scansToday, &apiKeysToday)

	var webhooksCount, workspacesCount int
	h.db.QueryRowContext(c.Context(), `SELECT COUNT(*) FROM webhook_registrations WHERE user_id=$1 AND enabled=true`, userID).Scan(&webhooksCount)
	h.db.QueryRowContext(c.Context(), `SELECT COUNT(*) FROM workspace_members WHERE user_id=$1`, userID).Scan(&workspacesCount)

	limits := plans.GetLimits(plan)

	var expiresAt *time.Time
	h.db.QueryRowContext(c.Context(), `SELECT expires_at FROM user_subscriptions WHERE user_id=$1`, userID).Scan(&expiresAt)

	return c.JSON(fiber.Map{
		"plan":       plan,
		"expires_at": expiresAt,
		"usage": fiber.Map{
			"scans_today":          scansToday,
			"scans_limit":          limits.DailyScans,
			"scans_remaining":      limits.DailyScans - scansToday,
			"api_keys_today":       apiKeysToday,
			"api_keys_limit":       limits.DailyAPIKeys,
			"api_keys_remaining":   limits.DailyAPIKeys - apiKeysToday,
			"webhooks_active":      webhooksCount,
			"webhooks_limit":       limits.MaxWebhooks,
			"webhooks_remaining":   limits.MaxWebhooks - webhooksCount,
			"workspaces_joined":    workspacesCount,
			"workspaces_limit":     limits.MaxWorkspaces,
			"workspaces_remaining": limits.MaxWorkspaces - workspacesCount,
			"webhook_gap_mins":     limits.WebhookScanGapMins,
		},
	})
}
