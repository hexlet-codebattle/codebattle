package extapi

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Client struct {
	mu         sync.RWMutex
	baseURL    string
	authKey    string
	httpClient *http.Client
}

type GroupScenarioRequest struct {
	UsersCount int            `json:"users_count"`
	Languages  []string       `json:"languages"`
	Tournament map[string]any `json:"tournament"`
	RunnerURL  string         `json:"runner_url,omitempty"`
}

type GroupScenarioResponse struct {
	Creator struct {
		ID        int    `json:"id"`
		Name      string `json:"name"`
		UserToken string `json:"user_token"`
	} `json:"creator"`
	GroupTournament struct {
		ID            int    `json:"id"`
		Slug          string `json:"slug"`
		State         string `json:"state"`
		GroupTaskID   int    `json:"group_task_id"`
		SliceSize     int    `json:"slice_size"`
		SliceStrategy string `json:"slice_strategy"`
	} `json:"group_tournament"`
	Users []GroupScenarioUser `json:"users"`
}

type GroupScenarioUser struct {
	UserID    int    `json:"user_id"`
	Name      string `json:"name"`
	Lang      string `json:"lang"`
	Token     string `json:"token"`
	UserToken string `json:"user_token"`
}

func NewClient(baseURL, authKey string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		authKey: authKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *Client) Reconfigure(baseURL, authKey string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.baseURL = strings.TrimRight(baseURL, "/")
	c.authKey = authKey
}

func (c *Client) BaseURL() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.baseURL
}

func (c *Client) CreateGroupScenario(ctx context.Context, req GroupScenarioRequest) (*GroupScenarioResponse, error) {
	var response GroupScenarioResponse
	if err := c.doJSON(ctx, http.MethodPost, "/ext_api/load_tests/group_scenarios", req, nil, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *Client) StartGroupScenario(ctx context.Context, groupTournamentID int) error {
	path := fmt.Sprintf("/ext_api/load_tests/group_scenarios/%d/start", groupTournamentID)
	return c.doJSON(ctx, http.MethodPost, path, struct{}{}, nil, nil)
}

func (c *Client) SubmitGroupTaskSolution(ctx context.Context, bearerToken, lang, solution string) error {
	payload := map[string]any{
		"lang":     lang,
		"solution": base64.StdEncoding.EncodeToString([]byte(solution)),
	}

	headers := http.Header{
		"Authorization": []string{"Bearer " + bearerToken},
	}

	return c.doJSON(ctx, http.MethodPost, "/api/v1/group_task_solutions", payload, headers, nil)
}

func (c *Client) doJSON(ctx context.Context, method, path string, payload any, extraHeaders http.Header, out any) error {
	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(raw)
	}

	c.mu.RLock()
	baseURL := c.baseURL
	authKey := c.authKey
	c.mu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, method, baseURL+path, body)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if authKey != "" {
		req.Header.Set("x-auth-key", authKey)
	}
	for key, values := range extraHeaders {
		for _, v := range values {
			req.Header.Set(key, v)
		}
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		data, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ext api %s %s failed: status=%d body=%s", method, path, resp.StatusCode, strings.TrimSpace(string(data)))
	}

	if out == nil {
		return nil
	}

	return json.NewDecoder(resp.Body).Decode(out)
}
