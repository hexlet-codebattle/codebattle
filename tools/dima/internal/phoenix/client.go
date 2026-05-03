package phoenix

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

type Message struct {
	JoinRef string
	Ref     string
	Topic   string
	Event   string
	Payload map[string]any
}

type Client struct {
	conn      *websocket.Conn
	writeMu   sync.Mutex
	ref       atomic.Uint64
	waitersMu sync.Mutex
	waiters   map[string]chan Message
	topicsMu  sync.RWMutex
	topics    map[string]chan Message
	joinRefs  map[string]string
}

func Connect(ctx context.Context, serverURL, userToken, accessToken string) (*Client, error) {
	wsURL, err := buildWebsocketURL(serverURL, userToken, accessToken)
	if err != nil {
		return nil, err
	}

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, wsURL, http.Header{})
	if err != nil {
		return nil, err
	}

	client := &Client{
		conn:     conn,
		waiters:  map[string]chan Message{},
		topics:   map[string]chan Message{},
		joinRefs: map[string]string{},
	}

	go client.readLoop()
	go client.heartbeatLoop(ctx)

	return client, nil
}

func (c *Client) Close() error {
	return c.conn.Close()
}

func (c *Client) Join(ctx context.Context, topic string, payload map[string]any) (<-chan Message, error) {
	events, _, err := c.JoinWithReply(ctx, topic, payload)
	return events, err
}

func (c *Client) JoinWithReply(ctx context.Context, topic string, payload map[string]any) (<-chan Message, Message, error) {
	events := make(chan Message, 64)
	c.topicsMu.Lock()
	c.topics[topic] = events
	c.topicsMu.Unlock()

	ref := strconv.FormatUint(c.ref.Add(1), 10)
	reply, err := c.pushWithRef(ctx, ref, ref, topic, "phx_join", payload)
	if err != nil {
		return nil, Message{}, err
	}

	if status, _ := reply.Payload["status"].(string); status != "ok" {
		return nil, Message{}, fmt.Errorf("join failed for %s: %+v", topic, reply.Payload)
	}

	c.topicsMu.Lock()
	c.joinRefs[topic] = ref
	c.topicsMu.Unlock()

	return events, reply, nil
}

func (c *Client) Leave(ctx context.Context, topic string) error {
	_, err := c.Push(ctx, topic, "phx_leave", map[string]any{})
	c.topicsMu.Lock()
	if ch, ok := c.topics[topic]; ok {
		close(ch)
		delete(c.topics, topic)
	}
	delete(c.joinRefs, topic)
	c.topicsMu.Unlock()
	return err
}

func (c *Client) Push(ctx context.Context, topic, event string, payload map[string]any) (Message, error) {
	ref := strconv.FormatUint(c.ref.Add(1), 10)
	joinRef := c.joinRefForTopic(topic, ref)
	return c.pushWithRef(ctx, joinRef, ref, topic, event, payload)
}

func (c *Client) pushWithRef(ctx context.Context, joinRef, ref, topic, event string, payload map[string]any) (Message, error) {
	replyCh := make(chan Message, 1)

	c.waitersMu.Lock()
	c.waiters[ref] = replyCh
	c.waitersMu.Unlock()

	frame := []any{joinRef, ref, topic, event, payload}
	if err := c.writeJSON(frame); err != nil {
		return Message{}, err
	}

	select {
	case reply := <-replyCh:
		return reply, nil
	case <-ctx.Done():
		return Message{}, ctx.Err()
	}
}

func (c *Client) Send(topic, event string, payload map[string]any) error {
	ref := strconv.FormatUint(c.ref.Add(1), 10)
	joinRef := c.joinRefForTopic(topic, ref)
	frame := []any{joinRef, ref, topic, event, payload}
	return c.writeJSON(frame)
}

func (c *Client) writeJSON(frame []any) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	return c.conn.WriteJSON(frame)
}

func (c *Client) heartbeatLoop(ctx context.Context) {
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_, _ = c.Push(context.Background(), "phoenix", "heartbeat", map[string]any{})
		}
	}
}

func (c *Client) readLoop() {
	for {
		var raw []json.RawMessage
		if err := c.conn.ReadJSON(&raw); err != nil {
			return
		}

		msg, err := decodeMessage(raw)
		if err != nil {
			continue
		}

		if msg.Event == "phx_reply" {
			c.waitersMu.Lock()
			replyCh, ok := c.waiters[msg.Ref]
			if ok {
				delete(c.waiters, msg.Ref)
			}
			c.waitersMu.Unlock()

			if ok {
				replyCh <- msg
				close(replyCh)
			}
			continue
		}

		c.topicsMu.RLock()
		topicCh, ok := c.topics[msg.Topic]
		c.topicsMu.RUnlock()
		if ok {
			select {
			case topicCh <- msg:
			default:
			}
		}
	}
}

func decodeMessage(raw []json.RawMessage) (Message, error) {
	if len(raw) != 5 {
		return Message{}, fmt.Errorf("unexpected frame len %d", len(raw))
	}

	var msg Message
	_ = json.Unmarshal(raw[0], &msg.JoinRef)
	_ = json.Unmarshal(raw[1], &msg.Ref)
	_ = json.Unmarshal(raw[2], &msg.Topic)
	_ = json.Unmarshal(raw[3], &msg.Event)
	_ = json.Unmarshal(raw[4], &msg.Payload)

	if msg.Payload == nil {
		msg.Payload = map[string]any{}
	}

	if response, ok := msg.Payload["response"].(map[string]any); ok {
		status, _ := msg.Payload["status"].(string)
		msg.Payload = map[string]any{
			"status":   status,
			"response": response,
		}
	}

	return msg, nil
}

func buildWebsocketURL(serverURL, userToken, accessToken string) (string, error) {
	base, err := url.Parse(strings.TrimRight(serverURL, "/"))
	if err != nil {
		return "", err
	}

	switch base.Scheme {
	case "http":
		base.Scheme = "ws"
	case "https":
		base.Scheme = "wss"
	}

	base.Path = strings.TrimRight(base.Path, "/") + "/ws/websocket"
	query := base.Query()
	query.Set("vsn", "2.0.0")
	query.Set("token", userToken)
	if accessToken != "" {
		query.Set("access_token", accessToken)
	}
	base.RawQuery = query.Encode()

	return base.String(), nil
}

func (c *Client) joinRefForTopic(topic, fallback string) string {
	c.topicsMu.RLock()
	defer c.topicsMu.RUnlock()

	if joinRef, ok := c.joinRefs[topic]; ok && joinRef != "" {
		return joinRef
	}

	return fallback
}
