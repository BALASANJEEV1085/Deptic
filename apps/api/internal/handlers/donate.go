package handlers

import (
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/razorpay/razorpay-go"
)

type DonateRequest struct {
	Amount   int64  `json:"amount"`
	Currency string `json:"currency"`
}

func HandleDonate(c *fiber.Ctx) error {
	var req DonateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Amount must be greater than zero"})
	}
	if req.Currency == "" {
		req.Currency = "INR"
	}

	rzpKey := os.Getenv("RAZORPAY_KEY_ID")
	rzpSecret := os.Getenv("RAZORPAY_KEY_SECRET")
	if rzpKey == "" || rzpSecret == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Razorpay not configured"})
	}

	client := razorpay.NewClient(rzpKey, rzpSecret)
	
	// Razorpay amounts are generally in the smallest currency unit (e.g. paise for INR, cents for USD)
	data := map[string]interface{}{
		"amount":   req.Amount * 100, 
		"currency": req.Currency,
		"receipt":  "receipt_donation",
	}
	
	body, err := client.Order.Create(data, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to create Razorpay order: %v", err)})
	}

	orderID, ok := body["id"].(string)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse Razorpay order ID"})
	}

	return c.JSON(fiber.Map{
		"gateway": "razorpay",
		"orderId": orderID,
		"key":     rzpKey,
	})
}
