package runtime

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/hexlet-codebattle/ars/internal/extapi"
	"github.com/hexlet-codebattle/ars/internal/phoenix"
)

type WorkerParams struct {
	Client                *extapi.Client
	ServerURL             string
	TournamentID          int
	AccessToken           string
	User                  extapi.ScenarioUser
	Behavior              Behavior
	OnTournamentConnected func()
	OnGameStarted         func()
	OnGameFinished        func()
	OnTaskSeen            func(taskID int)
	OnRoundFinished       func()
	OnTournamentState     func(state, breakState string)
	OnError               func()
	OnLog                 func(line string)
}

type Worker struct {
	params   WorkerParams
	behavior Behavior
	mu       sync.RWMutex
}

func NewWorker(params WorkerParams) *Worker {
	return &Worker{
		params:   params,
		behavior: params.Behavior,
	}
}

func (w *Worker) Run(ctx context.Context) {
	w.log("-> connect tournament socket")
	client, err := phoenix.Connect(ctx, w.params.ServerURL, w.params.User.UserToken, w.params.AccessToken)
	if err != nil {
		w.params.OnError()
		w.logf("!! connect error: %v", err)
		log.Printf("worker=%d connect error: %v", w.params.User.UserID, err)
		return
	}
	defer client.Close()

	topic := "tournament:" + strconv.Itoa(w.params.TournamentID)
	events, err := client.Join(ctx, topic, map[string]any{})
	if err != nil {
		w.params.OnError()
		w.logf("!! phx_join %s error: %v", topic, err)
		log.Printf("worker=%d tournament join error: %v", w.params.User.UserID, err)
		return
	}
	w.logf("<- phx_join %s", topic)

	w.log("-> tournament:join")
	if err := client.Send(topic, "tournament:join", map[string]any{}); err != nil {
		w.params.OnError()
		w.logf("!! tournament:join error: %v", err)
		log.Printf("worker=%d tournament:join error: %v", w.params.User.UserID, err)
		return
	}

	w.params.OnTournamentConnected()

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-events:
			if !ok {
				return
			}
			w.logf("<- %s", describeEvent(event))
			w.handleTournamentEvent(ctx, client, event)
		}
	}
}

func (w *Worker) handleTournamentEvent(ctx context.Context, client *phoenix.Client, event phoenix.Message) {
	switch event.Event {
	case "tournament:round_created":
		w.reportTournamentState(event)
	case "tournament:round_finished":
		w.reportTournamentState(event)
		if w.params.OnRoundFinished != nil {
			w.params.OnRoundFinished()
		}
	case "tournament:finished":
		w.reportTournamentState(event)
	case "tournament:match:upserted":
		match, _ := event.Payload["match"].(map[string]any)
		state, _ := match["state"].(string)
		if state != "playing" {
			return
		}

		gameID, ok := intFromAny(match["game_id"])
		if !ok {
			return
		}

		go w.playGame(ctx, client, gameID)
	}
}

func (w *Worker) playGame(ctx context.Context, client *phoenix.Client, gameID int) {
	behavior := w.getBehavior()
	if behavior.Paused {
		return
	}

	topic := "game:" + strconv.Itoa(gameID)
	events, joinReply, err := client.JoinWithReply(ctx, topic, map[string]any{})
	if err != nil {
		w.params.OnError()
		w.logf("!! phx_join %s error: %v", topic, err)
		return
	}
	defer client.Leave(context.Background(), topic)
	w.logf("<- phx_join %s", topic)
	if taskID, ok := extractGameTaskID(joinReply); ok {
		w.logf("<- game task=%d", taskID)
		w.params.OnTaskSeen(taskID)
	}

	w.params.OnGameStarted()
	defer w.params.OnGameFinished()

	behavior = w.waitForSolution(ctx, behavior, 5*time.Second)
	if behavior.Solution != "" {
		finalText, sendErr := w.typeSolution(ctx, client, topic, behavior)
		if sendErr != nil {
			w.params.OnError()
			return
		}

		time.Sleep(jitterDuration(time.Duration(behavior.SubmitDelayMS)*time.Millisecond, behavior.RandomnessPercent))
		w.logf("-> check_result %s", topic)
		err = client.Send(topic, "check_result", map[string]any{
			"lang_slug":   behavior.Lang,
			"editor_text": finalText,
		})
		if err != nil {
			w.params.OnError()
			return
		}
	}

	timeout := time.NewTimer(45 * time.Second)
	defer timeout.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-timeout.C:
			return
		case msg, ok := <-events:
			if !ok {
				return
			}
			w.logf("<- %s", describeEvent(msg))
			if msg.Event == "user:check_complete" || msg.Event == "game:timeout" {
				return
			}
		}
	}
}

func (w *Worker) UpdateBehavior(fn func(Behavior) Behavior) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.behavior = fn(w.behavior)
}

func (w *Worker) CurrentLang() string {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.behavior.Lang
}

func (w *Worker) getBehavior() Behavior {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.behavior
}

func (w *Worker) waitForSolution(ctx context.Context, behavior Behavior, timeout time.Duration) Behavior {
	if behavior.Solution != "" {
		return behavior
	}

	deadline := time.NewTimer(timeout)
	defer deadline.Stop()
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return w.getBehavior()
		case <-deadline.C:
			return w.getBehavior()
		case <-ticker.C:
			behavior = w.getBehavior()
			if behavior.Solution != "" {
				return behavior
			}
		}
	}
}

func (w *Worker) typeSolution(ctx context.Context, client *phoenix.Client, topic string, behavior Behavior) (string, error) {
	runes := []rune(behavior.Solution)
	if len(runes) == 0 {
		return "", nil
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(w.params.User.UserID) + int64(len(runes))))
	targetDuration := time.Duration(behavior.TypingDelayMS) * time.Millisecond
	stepDelay := targetDuration / time.Duration(maxInt(len(runes)/2, 1))
	if stepDelay < 35*time.Millisecond {
		stepDelay = 35 * time.Millisecond
	}

	buffer := make([]rune, 0, len(runes)+8)
	lastSentLen := -1

	for idx, ch := range runes {
		select {
		case <-ctx.Done():
			return string(buffer), ctx.Err()
		default:
		}

		if shouldInjectTypo(ch, idx, behavior.RandomnessPercent, rng) {
			buffer = append(buffer, randomTypoRune(ch, rng))
			if err := w.sendEditorData(client, topic, behavior.Lang, string(buffer)); err != nil {
				return string(buffer), err
			}
			time.Sleep(jitterDuration(stepDelay/2, behavior.RandomnessPercent))
			buffer = buffer[:len(buffer)-1]
			if err := w.sendEditorData(client, topic, behavior.Lang, string(buffer)); err != nil {
				return string(buffer), err
			}
		}

		buffer = append(buffer, ch)
		if len(buffer) != lastSentLen && shouldFlushChunk(ch, idx, rng) {
			if err := w.sendEditorData(client, topic, behavior.Lang, string(buffer)); err != nil {
				return string(buffer), err
			}
			lastSentLen = len(buffer)
		}

		time.Sleep(jitterDuration(stepDelay, behavior.RandomnessPercent))
	}

	finalText := string(buffer)
	if len(buffer) != lastSentLen {
		if err := w.sendEditorData(client, topic, behavior.Lang, finalText); err != nil {
			return finalText, err
		}
	}

	return finalText, nil
}

func intFromAny(value any) (int, bool) {
	switch typed := value.(type) {
	case float64:
		return int(typed), true
	case int:
		return typed, true
	default:
		return 0, false
	}
}

func (w *Worker) log(line string) {
	if w.params.OnLog != nil {
		w.params.OnLog(fmt.Sprintf("u%d %s", w.params.User.UserID, line))
	}
}

func (w *Worker) logf(format string, args ...any) {
	w.log(fmt.Sprintf(format, args...))
}

func describeEvent(msg phoenix.Message) string {
	switch msg.Event {
	case "tournament:match:upserted":
		if match, ok := msg.Payload["match"].(map[string]any); ok {
			return fmt.Sprintf("%s game=%v state=%v", msg.Event, match["game_id"], match["state"])
		}
	case "user:check_complete":
		return fmt.Sprintf("%s status=%v", msg.Event, msg.Payload["solution_status"])
	}

	return msg.Event
}

func extractGameTaskID(reply phoenix.Message) (int, bool) {
	response, ok := reply.Payload["response"].(map[string]any)
	if !ok {
		return 0, false
	}

	game, ok := response["game"].(map[string]any)
	if !ok {
		return 0, false
	}

	task, ok := game["task"].(map[string]any)
	if !ok {
		return 0, false
	}

	return intFromAny(task["id"])
}

func (w *Worker) reportTournamentState(event phoenix.Message) {
	if w.params.OnTournamentState == nil {
		return
	}

	tournament, ok := event.Payload["tournament"].(map[string]any)
	if !ok {
		return
	}

	state, _ := tournament["state"].(string)
	breakState, _ := tournament["break_state"].(string)
	w.params.OnTournamentState(state, breakState)
}

func (w *Worker) sendEditorData(client *phoenix.Client, topic, lang, text string) error {
	w.logf("-> editor:data %s len=%d", topic, len([]rune(text)))
	return client.Send(topic, "editor:data", map[string]any{
		"lang_slug":   lang,
		"editor_text": text,
	})
}

func shouldInjectTypo(ch rune, idx, randomness int, rng *rand.Rand) bool {
	if idx == 0 || ch == '\n' || ch == '\t' || randomness <= 0 {
		return false
	}

	chance := minInt(4+randomness/4, 35)
	return rng.Intn(100) < chance
}

func shouldFlushChunk(ch rune, idx int, rng *rand.Rand) bool {
	if ch == '\n' || ch == ' ' || ch == '\t' {
		return true
	}

	return idx%3 == 0 || rng.Intn(100) < 30
}

func randomTypoRune(ch rune, rng *rand.Rand) rune {
	const alphabet = "abcdefghijklmnopqrstuvwxyz_(){}[]=+-*/,.:"
	if ch >= 'A' && ch <= 'Z' {
		return rune('A' + rng.Intn(26))
	}
	if ch >= '0' && ch <= '9' {
		return rune('0' + rng.Intn(10))
	}
	return rune(alphabet[rng.Intn(len(alphabet))])
}

func jitterDuration(base time.Duration, randomness int) time.Duration {
	if base <= 0 {
		return 0
	}
	if randomness <= 0 {
		return base
	}

	spread := float64(base) * float64(minInt(randomness, 90)) / 100
	delta := (rand.Float64()*2 - 1) * spread
	result := time.Duration(float64(base) + delta)
	if result < 15*time.Millisecond {
		return 15 * time.Millisecond
	}
	return result
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
