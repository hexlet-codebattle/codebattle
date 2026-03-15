package extapi

import (
	"bytes"
	"context"
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

type ScenarioRequest struct {
	UsersCount int            `json:"users_count"`
	Languages  []string       `json:"languages"`
	Tournament map[string]any `json:"tournament"`
}

type ScenarioResponse struct {
	Creator struct {
		ID        int    `json:"id"`
		Name      string `json:"name"`
		UserToken string `json:"user_token"`
	} `json:"creator"`
	Tournament struct {
		ID          int    `json:"id"`
		AccessToken string `json:"access_token"`
		Type        string `json:"type"`
		State       string `json:"state"`
	} `json:"tournament"`
	Users []ScenarioUser `json:"users"`
}

type ScenarioUser struct {
	UserID    int    `json:"user_id"`
	Name      string `json:"name"`
	Lang      string `json:"lang"`
	UserToken string `json:"user_token"`
}

type TaskSolutionResponse struct {
	TaskID    int    `json:"task_id"`
	TaskName  string `json:"task_name"`
	Solutions struct {
		Python string `json:"python"`
		CPP    string `json:"cpp"`
	} `json:"solutions"`
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

func (c *Client) CreateScenario(ctx context.Context, req ScenarioRequest) (*ScenarioResponse, error) {
	var response ScenarioResponse
	if err := c.doJSON(ctx, http.MethodPost, "/ext_api/load_tests/scenarios", req, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *Client) GetTaskSolutions(ctx context.Context, taskID int) (*TaskSolutionResponse, error) {
	var response TaskSolutionResponse
	if err := c.doJSON(ctx, http.MethodGet, fmt.Sprintf("/ext_api/load_tests/tasks/%d/solutions", taskID), nil, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *Client) doJSON(ctx context.Context, method, path string, payload any, out any) error {
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

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		data, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ext api %s %s failed: status=%d body=%s", method, path, resp.StatusCode, strings.TrimSpace(string(data)))
	}

	return json.NewDecoder(resp.Body).Decode(out)
}
