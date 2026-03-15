package runtime

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/hexlet-codebattle/ars/internal/extapi"
	"github.com/hexlet-codebattle/ars/internal/phoenix"
)

type Master struct {
	client *extapi.Client
	opts   Options

	mu              sync.RWMutex
	wg              sync.WaitGroup
	runCancel       context.CancelFunc
	scenario        *extapi.ScenarioResponse
	workers         map[int]*Worker
	logs            []string
	ranking         []RankingEntry
	adminRefreshCh  chan struct{}
	tournamentState string
	breakState      string
	lastTaskName    string
	defaultBehavior map[string]Behavior
	tournamentConn  atomic.Int64
	activeGames     atomic.Int64
	completedGames  atomic.Int64
	failedEvents    atomic.Int64
	lastRoundTaskID atomic.Int64
}

func NewMaster(client *extapi.Client, opts Options) *Master {
	return &Master{
		client:  client,
		opts:    opts,
		workers: map[int]*Worker{},
		defaultBehavior: map[string]Behavior{
			"python": {Lang: "python", TypingDelayMS: opts.AvgTaskSeconds * 1000, SubmitDelayMS: 700, RandomnessPercent: opts.RandomnessPercent, Solution: ""},
			"cpp":    {Lang: "cpp", TypingDelayMS: opts.AvgTaskSeconds * 1000, SubmitDelayMS: 700, RandomnessPercent: opts.RandomnessPercent, Solution: ""},
		},
	}
}

func (m *Master) Options() Options {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return Options{
		ServerURL:            m.opts.ServerURL,
		AuthKey:              m.opts.AuthKey,
		UsersCount:           m.opts.UsersCount,
		RoundsLimit:          m.opts.RoundsLimit,
		BreakDurationSeconds: m.opts.BreakDurationSeconds,
		AvgTaskSeconds:       m.opts.AvgTaskSeconds,
		RandomnessPercent:    m.opts.RandomnessPercent,
		JoinRampSeconds:      m.opts.JoinRampSeconds,
		LangMix:              append([]string(nil), m.opts.LangMix...),
	}
}

func (m *Master) UpdateOptions(opts Options) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.opts = opts
	m.client.Reconfigure(opts.ServerURL, opts.AuthKey)
	m.syncDefaultBehaviorsLocked()
	for _, worker := range m.workers {
		worker.UpdateBehavior(func(b Behavior) Behavior {
			b.TypingDelayMS = opts.AvgTaskSeconds * 1000
			b.RandomnessPercent = opts.RandomnessPercent
			if b.SubmitDelayMS == 0 {
				b.SubmitDelayMS = 700
			}
			return b
		})
	}
}

func (m *Master) CreateScenario(ctx context.Context) error {
	m.stopWorkers()

	req := extapi.ScenarioRequest{
		UsersCount: m.opts.UsersCount,
		Languages:  m.opts.LangMix,
		Tournament: map[string]any{
			"type":                   "swiss",
			"access_type":            "token",
			"rounds_limit":           m.opts.RoundsLimit,
			"break_duration_seconds": m.opts.BreakDurationSeconds,
		},
	}

	scenario, err := m.client.CreateScenario(ctx, req)
	if err != nil {
		return err
	}

	m.mu.Lock()
	m.scenario = scenario
	m.workers = map[int]*Worker{}
	m.resetCountersLocked()
	m.mu.Unlock()

	for _, user := range scenario.Users {
		behavior, ok := m.defaultBehavior[user.Lang]
		if !ok {
			behavior = Behavior{
				Lang:              user.Lang,
				TypingDelayMS:     m.opts.AvgTaskSeconds * 1000,
				SubmitDelayMS:     700,
				RandomnessPercent: m.opts.RandomnessPercent,
			}
		}
		worker := NewWorker(WorkerParams{
			Client:       m.client,
			ServerURL:    m.opts.ServerURL,
			TournamentID: scenario.Tournament.ID,
			AccessToken:  scenario.Tournament.AccessToken,
			User:         user,
			Behavior:     behavior,
			OnTournamentConnected: func() {
				m.tournamentConn.Add(1)
			},
			OnGameStarted: func() {
				m.activeGames.Add(1)
			},
			OnGameFinished: func() {
				m.activeGames.Add(-1)
				m.completedGames.Add(1)
			},
			OnTaskSeen: func(taskID int) {
				m.handleTaskSeen(taskID)
			},
			OnRoundFinished: func() {
				m.TriggerAdminRefresh()
			},
			OnTournamentState: func(state, breakState string) {
				m.setTournamentState(state, breakState)
			},
			OnError: func() {
				m.failedEvents.Add(1)
			},
			OnLog: func(line string) {
				m.appendLog(line)
			},
		})

		m.mu.Lock()
		m.workers[user.UserID] = worker
		m.mu.Unlock()
	}

	return nil
}

func (m *Master) JoinScenario(ctx context.Context) error {
	m.mu.RLock()
	scenario := m.scenario
	workers := make([]*Worker, 0, len(m.workers))
	for _, worker := range m.workers {
		workers = append(workers, worker)
	}
	m.mu.RUnlock()

	if scenario == nil {
		return fmt.Errorf("create a scenario first")
	}

	if len(workers) == 0 {
		return fmt.Errorf("no users available for tournament %d", scenario.Tournament.ID)
	}

	m.stopWorkers()
	runCtx, cancel := context.WithCancel(ctx)

	m.mu.Lock()
	m.runCancel = cancel
	m.resetCountersLocked()
	m.adminRefreshCh = make(chan struct{}, 1)
	m.mu.Unlock()

	joinDelay := m.joinRampDelay(len(workers))
	for i, worker := range workers {
		m.wg.Add(1)
		go func(index int, worker *Worker) {
			defer m.wg.Done()
			if joinDelay > 0 {
				timer := time.NewTimer(time.Duration(index) * joinDelay)
				defer timer.Stop()
				select {
				case <-runCtx.Done():
					return
				case <-timer.C:
				}
			}
			worker.Run(runCtx)
		}(i, worker)
	}

	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		m.runAdminMonitor(runCtx)
	}()

	return nil
}

func (m *Master) StartScenario(ctx context.Context) error {
	m.mu.RLock()
	scenario := m.scenario
	serverURL := m.opts.ServerURL
	m.mu.RUnlock()

	if scenario == nil {
		return fmt.Errorf("create a scenario first")
	}

	client, err := phoenix.Connect(ctx, serverURL, scenario.Creator.UserToken, "")
	if err != nil {
		return err
	}
	defer client.Close()
	m.appendLog(fmt.Sprintf("admin -> connect tournament_admin:%d", scenario.Tournament.ID))

	topic := fmt.Sprintf("tournament_admin:%d", scenario.Tournament.ID)
	if _, err := client.Join(ctx, topic, map[string]any{}); err != nil {
		return err
	}
	m.appendLog(fmt.Sprintf("admin <- phx_join %s", topic))

	m.appendLog("admin -> tournament:start")
	return client.Send(topic, "tournament:start", map[string]any{})
}

func (m *Master) Wait() {
	m.stopWorkers()
	m.wg.Wait()
}

func (m *Master) Snapshot() Snapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()

	behaviors := make(map[string]Behavior, len(m.defaultBehavior))
	for key, value := range m.defaultBehavior {
		behaviors[key] = value
	}

	usersTotal := 0
	if m.scenario != nil {
		usersTotal = len(m.scenario.Users)
	}

	return Snapshot{
		TournamentID:          int(m.currentTournamentID()),
		TournamentURL:         m.currentTournamentURL(),
		TournamentState:       m.tournamentState,
		TournamentBreakState:  m.breakState,
		UsersTotal:            usersTotal,
		TournamentConnected:   int(m.tournamentConn.Load()),
		ActiveGames:           int(m.activeGames.Load()),
		CompletedGames:        int(m.completedGames.Load()),
		FailedEvents:          int(m.failedEvents.Load()),
		LastRoundTaskID:       int(m.lastRoundTaskID.Load()),
		LastTaskName:          m.lastTaskName,
		Logs:                  append([]string(nil), m.logs...),
		Ranking:               append([]RankingEntry(nil), m.ranking...),
		DefaultBehaviorByLang: behaviors,
	}
}

func (m *Master) SetLanguage(target, lang string) error {
	m.mu.Lock()
	if target == "all" {
		for name, behavior := range m.defaultBehavior {
			behavior.Lang = lang
			m.defaultBehavior[name] = behavior
		}
		for _, worker := range m.workers {
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.Lang = lang
				return b
			})
		}
	}
	worker := m.getWorkerLocked(target)
	m.mu.Unlock()

	if worker != nil {
		worker.UpdateBehavior(func(b Behavior) Behavior {
			b.Lang = lang
			return b
		})
	}

	return nil
}

func (m *Master) SetSolution(lang, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	m.mu.Lock()
	behavior := m.defaultBehavior[lang]
	behavior.Solution = string(data)
	m.defaultBehavior[lang] = behavior
	for _, worker := range m.workers {
		if worker.CurrentLang() == lang {
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.Solution = string(data)
				return b
			})
		}
	}
	m.mu.Unlock()
	return nil
}

func (m *Master) SetSpeed(target string, delayMS int) error {
	m.mu.Lock()
	if delayMS < 1000 {
		m.opts.AvgTaskSeconds = 1
	} else {
		m.opts.AvgTaskSeconds = delayMS / 1000
	}
	if target == "all" {
		for key, behavior := range m.defaultBehavior {
			behavior.TypingDelayMS = delayMS
			m.defaultBehavior[key] = behavior
		}
		for _, worker := range m.workers {
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.TypingDelayMS = delayMS
				return b
			})
		}
	}
	worker := m.getWorkerLocked(target)
	m.mu.Unlock()
	if worker != nil {
		worker.UpdateBehavior(func(b Behavior) Behavior {
			b.TypingDelayMS = delayMS
			return b
		})
	}
	return nil
}

func (m *Master) SetRandomness(target string, percent int) error {
	if percent < 0 {
		percent = 0
	}

	m.mu.Lock()
	m.opts.RandomnessPercent = percent
	if target == "all" {
		for key, behavior := range m.defaultBehavior {
			behavior.RandomnessPercent = percent
			m.defaultBehavior[key] = behavior
		}
		for _, worker := range m.workers {
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.RandomnessPercent = percent
				return b
			})
		}
		m.mu.Unlock()
		return nil
	}

	worker := m.getWorkerLocked(target)
	m.mu.Unlock()
	if worker == nil {
		return fmt.Errorf("worker %s not found", target)
	}

	worker.UpdateBehavior(func(b Behavior) Behavior {
		b.RandomnessPercent = percent
		return b
	})
	return nil
}

func (m *Master) Pause(target string, paused bool) error {
	m.mu.Lock()
	if target == "all" {
		for key, behavior := range m.defaultBehavior {
			behavior.Paused = paused
			m.defaultBehavior[key] = behavior
		}
		for _, worker := range m.workers {
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.Paused = paused
				return b
			})
		}
		m.mu.Unlock()
		return nil
	}

	worker := m.getWorkerLocked(target)
	m.mu.Unlock()
	if worker == nil {
		return fmt.Errorf("worker %s not found", target)
	}

	worker.UpdateBehavior(func(b Behavior) Behavior {
		b.Paused = paused
		return b
	})
	return nil
}

func (m *Master) LoadTaskSolutions(ctx context.Context, taskID int) error {
	solutions, err := m.client.GetTaskSolutions(ctx, taskID)
	if err != nil {
		return err
	}

	m.mu.Lock()
	python := m.defaultBehavior["python"]
	python.Solution = solutions.Solutions.Python
	m.defaultBehavior["python"] = python

	cpp := m.defaultBehavior["cpp"]
	cpp.Solution = solutions.Solutions.CPP
	m.defaultBehavior["cpp"] = cpp
	m.lastTaskName = solutions.TaskName

	for _, worker := range m.workers {
		lang := worker.CurrentLang()
		switch lang {
		case "python":
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.Solution = python.Solution
				return b
			})
		case "cpp":
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.Solution = cpp.Solution
				return b
			})
		}
	}
	m.mu.Unlock()
	return nil
}

func (m *Master) currentTournamentID() int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.scenario == nil {
		return 0
	}
	return int64(m.scenario.Tournament.ID)
}

func (m *Master) currentTournamentURL() string {
	if m.scenario == nil {
		return ""
	}

	baseURL := strings.TrimRight(m.opts.ServerURL, "/")
	if baseURL == "" {
		return ""
	}

	return fmt.Sprintf(
		"%s/tournaments/%d?access_token=%s",
		baseURL,
		m.scenario.Tournament.ID,
		m.scenario.Tournament.AccessToken,
	)
}

func (m *Master) getWorkerLocked(target string) *Worker {
	if target == "all" {
		return nil
	}

	var userID int
	_, _ = fmt.Sscanf(target, "%d", &userID)
	return m.workers[userID]
}

func (m *Master) handleTaskSeen(taskID int) {
	for {
		current := m.lastRoundTaskID.Load()
		if current == int64(taskID) {
			return
		}

		if m.lastRoundTaskID.CompareAndSwap(current, int64(taskID)) {
			go func() {
				m.appendLog(fmt.Sprintf("system -> load task solutions %d", taskID))
				if err := m.LoadTaskSolutions(context.Background(), taskID); err != nil {
					m.failedEvents.Add(1)
					m.appendLog(fmt.Sprintf("system !! load task solutions %d failed: %v", taskID, err))
					log.Printf("task=%d solution load error: %v", taskID, err)
					return
				}
				m.appendLog(fmt.Sprintf("system <- task solutions loaded %d", taskID))
			}()
			return
		}
	}
}

func (m *Master) stopWorkers() {
	m.mu.Lock()
	cancel := m.runCancel
	m.runCancel = nil
	m.mu.Unlock()

	if cancel != nil {
		cancel()
		m.wg.Wait()
	}
}

func (m *Master) resetCountersLocked() {
	m.tournamentConn.Store(0)
	m.activeGames.Store(0)
	m.completedGames.Store(0)
	m.failedEvents.Store(0)
	m.lastRoundTaskID.Store(0)
	m.logs = nil
	m.ranking = nil
	m.tournamentState = ""
	m.breakState = ""
	m.lastTaskName = ""
}

func (m *Master) appendLog(line string) {
	const maxLogs = 200

	m.mu.Lock()
	defer m.mu.Unlock()

	m.logs = append(m.logs, time.Now().Format("15:04:05")+" "+line)
	if len(m.logs) > maxLogs {
		m.logs = m.logs[len(m.logs)-maxLogs:]
	}
}

func (m *Master) fetchRanking(ctx context.Context, serverURL string, scenario *extapi.ScenarioResponse) ([]RankingEntry, error) {
	client, err := phoenix.Connect(ctx, serverURL, scenario.Creator.UserToken, "")
	if err != nil {
		return nil, err
	}
	defer client.Close()

	topic := fmt.Sprintf("tournament_admin:%d", scenario.Tournament.ID)
	_, reply, err := client.JoinWithReply(ctx, topic, map[string]any{})
	if err != nil {
		return nil, err
	}

	response, ok := reply.Payload["response"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("ranking response missing payload")
	}

	rankingData, ok := response["ranking"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("ranking response missing ranking")
	}

	entriesRaw, ok := rankingData["entries"].([]any)
	if !ok {
		return nil, fmt.Errorf("ranking response missing entries")
	}

	entries := make([]RankingEntry, 0, min(len(entriesRaw), 20))
	for _, item := range entriesRaw {
		entryMap, ok := item.(map[string]any)
		if !ok {
			continue
		}

		id, _ := intFromAny(entryMap["id"])
		place, _ := intFromAny(entryMap["place"])
		score, _ := intFromAny(entryMap["score"])
		name, _ := entryMap["name"].(string)

		entries = append(entries, RankingEntry{
			ID:    id,
			Place: place,
			Name:  name,
			Score: score,
		})

		if len(entries) == 20 {
			break
		}
	}

	return entries, nil
}

func (m *Master) runAdminMonitor(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	initialDelay := 2 * time.Second
	if m.opts.JoinRampSeconds > 0 {
		initialDelay = time.Duration(m.opts.JoinRampSeconds+1) * time.Second
	}
	timer := time.NewTimer(initialDelay)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			m.refreshRankingOnce(ctx)
		case <-ticker.C:
			m.refreshRankingOnce(ctx)
		case <-m.adminRefreshSignal():
			m.refreshRankingOnce(ctx)
		}
	}
}

func (m *Master) refreshRankingOnce(ctx context.Context) {
	m.mu.RLock()
	scenario := m.scenario
	serverURL := m.opts.ServerURL
	m.mu.RUnlock()

	if scenario == nil {
		return
	}

	m.appendLog(fmt.Sprintf("admin -> refresh ranking tournament_admin:%d", scenario.Tournament.ID))
	ranking, err := m.fetchRanking(ctx, serverURL, scenario)
	if err != nil {
		m.failedEvents.Add(1)
		m.appendLog(fmt.Sprintf("system !! ranking refresh failed: %v", err))
		return
	}

	m.mu.Lock()
	m.ranking = ranking
	m.mu.Unlock()
	m.appendLog(fmt.Sprintf("admin <- ranking refreshed entries=%d", len(ranking)))
}

func (m *Master) TriggerAdminRefresh() {
	select {
	case m.adminRefreshSignal() <- struct{}{}:
	default:
	}
}

func (m *Master) adminRefreshSignal() chan struct{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.adminRefreshCh
}

func (m *Master) syncDefaultBehaviorsLocked() {
	for key, behavior := range m.defaultBehavior {
		behavior.TypingDelayMS = m.opts.AvgTaskSeconds * 1000
		behavior.RandomnessPercent = m.opts.RandomnessPercent
		if behavior.SubmitDelayMS == 0 {
			behavior.SubmitDelayMS = 700
		}
		m.defaultBehavior[key] = behavior
	}
}

func (m *Master) setTournamentState(state, breakState string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if strings.TrimSpace(state) != "" {
		m.tournamentState = state
	}
	if strings.TrimSpace(breakState) != "" {
		m.breakState = breakState
	}
}

func (m *Master) joinRampDelay(workersCount int) time.Duration {
	if workersCount <= 1 || m.opts.JoinRampSeconds <= 0 {
		return 0
	}

	total := time.Duration(m.opts.JoinRampSeconds) * time.Second
	delay := total / time.Duration(workersCount-1)
	if delay < time.Millisecond {
		return time.Millisecond
	}
	return delay
}
