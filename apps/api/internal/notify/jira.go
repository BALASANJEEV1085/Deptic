package notify

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type JiraConfig struct {
	BaseURL    string `json:"base_url"`
	Email      string `json:"email"`
	APIToken   string `json:"api_token"`
	ProjectKey string `json:"project_key"`
}

type JiraIssue struct {
	Fields struct {
		Project     map[string]string `json:"project"`
		Summary     string            `json:"summary"`
		Description map[string]any    `json:"description"`
		IssueType   map[string]string `json:"issuetype"`
		Priority    map[string]string `json:"priority,omitempty"`
		Labels      []string          `json:"labels"`
	} `json:"fields"`
}

// CreateJiraTicket creates an issue in Jira
func CreateJiraTicket(ctx context.Context, cfg JiraConfig, issue JiraIssue) (string, error) {
	body, err := json.Marshal(issue)
	if err != nil {
		return "", fmt.Errorf("failed to marshal jira issue: %w", err)
	}

	url := strings.TrimRight(cfg.BaseURL, "/") + "/rest/api/3/issue"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create jira request: %w", err)
	}

	auth := base64.StdEncoding.EncodeToString([]byte(cfg.Email + ":" + cfg.APIToken))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("jira api error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		buf := new(bytes.Buffer)
		buf.ReadFrom(resp.Body)
		return "", fmt.Errorf("jira returned status code %d: %s", resp.StatusCode, buf.String())
	}

	var res struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", fmt.Errorf("failed to decode jira response: %w", err)
	}

	return res.Key, nil
}
