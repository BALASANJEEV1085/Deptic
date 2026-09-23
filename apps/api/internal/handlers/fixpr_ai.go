package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/deptic-io/api/internal/github"
)

const openRouterModel = "openai/gpt-oss-20b"

type aiManifest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type aiFilePatch struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type aiPatchResponse struct {
	Files   []aiFilePatch `json:"files"`
	Summary string        `json:"summary"`
}

type openRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func requestAIPatches(ctx context.Context, vulnerabilities []VulnerabilityFix, manifests []aiManifest) (aiPatchResponse, error) {
	apiKey := strings.TrimSpace(os.Getenv("OPEN_ROUTER_API"))
	if apiKey == "" {
		return aiPatchResponse{}, fmt.Errorf("OPEN_ROUTER_API is not configured")
	}

	payload := map[string]interface{}{
		"model":           openRouterModel,
		"temperature":     0,
		"response_format": map[string]string{"type": "json_object"},
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": `You are a dependency security patching engine. Analyze the supplied vulnerabilities and complete manifest files. Return ONLY valid JSON with this exact shape: {"files":[{"path":"relative manifest path","content":"complete updated file content"}],"summary":"brief summary"}. Return one entry for every file that must change, using the exact supplied path. Preserve formatting and unrelated content. Make the smallest compatible dependency changes that remove the listed vulnerabilities. Never invent files, paths, versions, package names, or lockfile content. Do not include markdown fences or explanations outside the JSON.`,
			},
			{
				"role": "user",
				"content": mustMarshal(map[string]interface{}{
					"vulnerabilities": vulnerabilities,
					"manifest_files":  manifests,
				}),
			},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return aiPatchResponse{}, fmt.Errorf("encode OpenRouter request: %w", err)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, "https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return aiPatchResponse{}, fmt.Errorf("create OpenRouter request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://deptic.io")
	req.Header.Set("X-Title", "DEPTIC.io security fix PR")

	resp, err := (&http.Client{Timeout: 2 * time.Minute}).Do(req)
	if err != nil {
		return aiPatchResponse{}, fmt.Errorf("call OpenRouter: %w", err)
	}
	defer resp.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return aiPatchResponse{}, fmt.Errorf("read OpenRouter response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiError openRouterResponse
		_ = json.Unmarshal(responseBody, &apiError)
		if apiError.Error != nil {
			return aiPatchResponse{}, fmt.Errorf("OpenRouter returned %d: %s", resp.StatusCode, apiError.Error.Message)
		}
		return aiPatchResponse{}, fmt.Errorf("OpenRouter returned %d", resp.StatusCode)
	}

	var completion openRouterResponse
	if err := json.Unmarshal(responseBody, &completion); err != nil || len(completion.Choices) == 0 {
		return aiPatchResponse{}, fmt.Errorf("OpenRouter returned no usable completion")
	}
	content := strings.TrimSpace(completion.Choices[0].Message.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(strings.TrimSpace(content), "```")

	var result aiPatchResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(content)), &result); err != nil {
		return aiPatchResponse{}, fmt.Errorf("OpenRouter returned invalid patch JSON: %w", err)
	}
	if len(result.Files) == 0 {
		return aiPatchResponse{}, fmt.Errorf("OpenRouter returned no file patches")
	}

	allowed := make(map[string]struct{}, len(manifests))
	for _, manifest := range manifests {
		allowed[manifest.Path] = struct{}{}
	}
	for _, patch := range result.Files {
		if patch.Path == "" || strings.HasPrefix(patch.Path, "/") || strings.Contains(patch.Path, "..") {
			return aiPatchResponse{}, fmt.Errorf("OpenRouter returned unsafe file path %q", patch.Path)
		}
		if _, ok := allowed[patch.Path]; !ok {
			return aiPatchResponse{}, fmt.Errorf("OpenRouter returned a file that was not supplied: %s", patch.Path)
		}
		if patch.Content == "" {
			return aiPatchResponse{}, fmt.Errorf("OpenRouter returned empty content for %s", patch.Path)
		}
	}
	return result, nil
}

func loadAIManifests(ctx context.Context, client *github.Client, owner, repo string) ([]aiManifest, error) {
	entries, err := client.FindAllManifests(ctx, owner, repo)
	if err != nil {
		return nil, err
	}
	manifests := make([]aiManifest, 0, len(entries))
	for _, entry := range entries {
		content, err := client.FetchFile(ctx, owner, repo, entry.Path)
		if err != nil {
			return nil, fmt.Errorf("load manifest %s: %w", entry.Path, err)
		}
		manifests = append(manifests, aiManifest{Path: entry.Path, Content: string(content)})
	}
	if len(manifests) == 0 {
		return nil, fmt.Errorf("no supported manifest files found")
	}
	return manifests, nil
}

func mustMarshal(value interface{}) string {
	b, _ := json.Marshal(value)
	return string(b)
}
