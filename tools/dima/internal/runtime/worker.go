package runtime

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/hexlet-codebattle/dima/internal/extapi"
	"github.com/hexlet-codebattle/dima/internal/phoenix"
)

type WorkerParams struct {
	Client             *extapi.Client
	ServerURL          string
	GroupTournamentID  int
	User               extapi.GroupScenarioUser
	Behavior           Behavior
	OnChannelConnected func()
	OnSolutionSent     func()
	OnRunResult        func(userID int, status string, score int)
	OnError            func()
	OnLog              func(line string)
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
	w.log("-> connect group_tournament socket")
	client, err := phoenix.Connect(ctx, w.params.ServerURL, w.params.User.UserToken, "")
	if err != nil {
		w.fail("connect", err)
		return
	}
	defer client.Close()

	topic := fmt.Sprintf("group_tournament:%d", w.params.GroupTournamentID)
	events, err := client.Join(ctx, topic, map[string]any{})
	if err != nil {
		w.fail("phx_join "+topic, err)
		return
	}
	w.logf("<- phx_join %s", topic)
	w.params.OnChannelConnected()

	submitTicker := time.NewTimer(w.nextSubmitDelay(true))
	defer submitTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-events:
			if !ok {
				return
			}
			w.handleEvent(event)
		case <-submitTicker.C:
			w.maybeSubmit(ctx)
			submitTicker.Reset(w.nextSubmitDelay(false))
		}
	}
}

func (w *Worker) handleEvent(event phoenix.Message) {
	switch event.Event {
	case "group_tournament:run_updated":
		status, _ := event.Payload["status"].(string)
		score, _ := intFromAny(event.Payload["score"])
		userID, _ := intFromAny(event.Payload["user_id"])
		w.logf("<- run_updated status=%s score=%d", status, score)
		if w.params.OnRunResult != nil {
			w.params.OnRunResult(userID, status, score)
		}
	default:
		// ignore other broadcasts
	}
}

func (w *Worker) maybeSubmit(ctx context.Context) {
	behavior := w.getBehavior()
	if behavior.Paused {
		return
	}
	if len(behavior.SolutionPool) == 0 {
		return
	}

	idx := rand.Intn(len(behavior.SolutionPool))
	solution := behavior.SolutionPool[idx]
	w.logf("-> submit solution lang=%s pool=%d/%d len=%d", behavior.Lang, idx+1, len(behavior.SolutionPool), len(solution))
	err := w.params.Client.SubmitGroupTaskSolution(ctx, w.params.User.Token, behavior.Lang, solution)
	if err != nil {
		w.fail("submit_solution", err)
		return
	}
	if w.params.OnSolutionSent != nil {
		w.params.OnSolutionSent()
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

func (w *Worker) nextSubmitDelay(initial bool) time.Duration {
	behavior := w.getBehavior()
	base := time.Duration(behavior.SubmitDelayMS) * time.Millisecond
	if base <= 0 {
		base = 20 * time.Second
	}
	if initial {
		base = base / 2
		if base < 500*time.Millisecond {
			base = 500 * time.Millisecond
		}
	}
	return jitterDuration(base, behavior.RandomnessPercent)
}

func (w *Worker) log(line string) {
	if w.params.OnLog != nil {
		w.params.OnLog(fmt.Sprintf("u%d %s", w.params.User.UserID, line))
	}
}

func (w *Worker) logf(format string, args ...any) {
	w.log(fmt.Sprintf(format, args...))
}

func (w *Worker) fail(action string, err error) {
	if w.params.OnError != nil {
		w.params.OnError()
	}
	w.logf("!! %s error: %v", action, err)
	log.Printf("worker=%d %s error: %v", w.params.User.UserID, action, err)
}

func intFromAny(value any) (int, bool) {
	switch typed := value.(type) {
	case float64:
		return int(typed), true
	case int:
		return typed, true
	case int64:
		return int(typed), true
	case string:
		n, err := strconv.Atoi(typed)
		if err != nil {
			return 0, false
		}
		return n, true
	default:
		return 0, false
	}
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
	if result < 200*time.Millisecond {
		return 200 * time.Millisecond
	}
	return result
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
