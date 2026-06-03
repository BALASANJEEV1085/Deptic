package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type SendEmailPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func SendEmail(ctx context.Context, toEmail, subject, htmlBody string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		fmt.Printf("[Email Log] (RESEND_API_KEY not configured) To: %s\nSubject: %s\nBody: %s\n", toEmail, subject, htmlBody)
		return nil
	}

	payload := SendEmailPayload{
		From:    "DEPTIC.io <onboarding@resend.dev>",
		To:      []string{toEmail},
		Subject: subject,
		HTML:    htmlBody,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal email payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create email request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("resend email request error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend api returned status code %d", resp.StatusCode)
	}

	return nil
}

func SendInvitationEmail(ctx context.Context, toEmail, inviterName, workspaceName, role, token string) error {
	subject := fmt.Sprintf("%s invited you to %s on DEPTIC.io", inviterName, workspaceName)
	acceptURL := fmt.Sprintf("http://localhost:3000/invite/%s", token)

	if siteURL := os.Getenv("NEXT_PUBLIC_SITE_URL"); siteURL != "" {
		acceptURL = fmt.Sprintf("%s/invite/%s", siteURL, token)
	}

	htmlBody := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
			<h2 style="color: #10b981;">Join %s on DEPTIC.io</h2>
			<p>Hi,</p>
			<p><strong>%s</strong> has invited you to join the <strong>%s</strong> workspace as a <strong>%s</strong>.</p>
			<div style="margin: 30px 0; text-align: center;">
				<a href="%s" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
			</div>
			<p style="color: #666; font-size: 12px;">If you did not expect this invitation, you can safely ignore this email.</p>
		</div>
	`, workspaceName, inviterName, workspaceName, role, acceptURL)

	return SendEmail(ctx, toEmail, subject, htmlBody)
}
