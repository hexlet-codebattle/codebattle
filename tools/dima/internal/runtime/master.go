package runtime

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/hexlet-codebattle/dima/internal/extapi"
)

type Master struct {
	client *extapi.Client
	opts   Options

	mu                 sync.RWMutex
	wg                 sync.WaitGroup
	runCancel          context.CancelFunc
	scenario           *extapi.GroupScenarioResponse
	workers            map[int]*Worker
	logs               []string
	defaultBehavior    map[string]Behavior
	bestScores         map[int]ScoreEntry
	channelConnected   atomic.Int64
	solutionsSubmitted atomic.Int64
	runsOk             atomic.Int64
	runsError          atomic.Int64
	failedEvents       atomic.Int64
	tournamentState    string
}

func NewMaster(client *extapi.Client, opts Options) *Master {
	m := &Master{
		client:          client,
		opts:            opts,
		workers:         map[int]*Worker{},
		defaultBehavior: map[string]Behavior{},
		bestScores:      map[int]ScoreEntry{},
	}
	m.rebuildDefaultBehaviorsLocked()
	return m
}

func (m *Master) Options() Options {
	m.mu.RLock()
	defer m.mu.RUnlock()
	opts := m.opts
	opts.LangMix = append([]string(nil), m.opts.LangMix...)
	return opts
}

func (m *Master) UpdateOptions(opts Options) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.opts = opts
	m.client.Reconfigure(opts.ServerURL, opts.AuthKey)
	m.rebuildDefaultBehaviorsLocked()
	for _, worker := range m.workers {
		lang := worker.CurrentLang()
		behavior := m.defaultBehavior[lang]
		worker.UpdateBehavior(func(b Behavior) Behavior {
			b.SubmitDelayMS = behavior.SubmitDelayMS
			b.RandomnessPercent = behavior.RandomnessPercent
			b.SolutionPool = behavior.SolutionPool
			return b
		})
	}
}

func (m *Master) CreateScenario(ctx context.Context) error {
	m.stopWorkers()

	tournament := map[string]any{
		"slice_size":     m.opts.SliceSize,
		"slice_strategy": m.opts.SliceStrategy,
	}
	if m.opts.GroupTaskID > 0 {
		tournament["group_task_id"] = m.opts.GroupTaskID
	}

	req := extapi.GroupScenarioRequest{
		UsersCount: m.opts.UsersCount,
		Languages:  m.opts.LangMix,
		Tournament: tournament,
		RunnerURL:  m.opts.RunnerURL,
	}

	m.appendLog(fmt.Sprintf("system -> create scenario users=%d slice=%d (%s)", m.opts.UsersCount, m.opts.SliceSize, m.opts.SliceStrategy))
	scenario, err := m.client.CreateGroupScenario(ctx, req)
	if err != nil {
		m.appendLog(fmt.Sprintf("system !! create scenario failed: %v", err))
		return err
	}

	m.mu.Lock()
	m.scenario = scenario
	m.workers = map[int]*Worker{}
	m.bestScores = map[int]ScoreEntry{}
	m.resetCountersLocked()
	m.tournamentState = scenario.GroupTournament.State
	m.mu.Unlock()

	for _, user := range scenario.Users {
		behavior := m.behaviorForLang(user.Lang)
		userCopy := user
		worker := NewWorker(WorkerParams{
			Client:            m.client,
			ServerURL:         m.opts.ServerURL,
			GroupTournamentID: scenario.GroupTournament.ID,
			User:              userCopy,
			Behavior:          behavior,
			OnChannelConnected: func() {
				m.channelConnected.Add(1)
			},
			OnSolutionSent: func() {
				m.solutionsSubmitted.Add(1)
			},
			OnRunResult: func(userID int, status string, score int) {
				m.recordRunResult(userCopy, status, score)
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

	m.appendLog(fmt.Sprintf("system <- scenario tournament_id=%d users=%d", scenario.GroupTournament.ID, len(scenario.Users)))
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
		m.appendLog("system !! join: no scenario yet (press c first)")
		return fmt.Errorf("create a scenario first")
	}
	if len(workers) == 0 {
		return fmt.Errorf("no users available for tournament %d", scenario.GroupTournament.ID)
	}

	m.appendLog(fmt.Sprintf("system -> join scenario tournament_id=%d workers=%d", scenario.GroupTournament.ID, len(workers)))
	m.stopWorkers()
	runCtx, cancel := context.WithCancel(ctx)

	m.mu.Lock()
	m.runCancel = cancel
	m.resetCountersLocked()
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

	return nil
}

func (m *Master) StartScenario(ctx context.Context) error {
	m.mu.RLock()
	scenario := m.scenario
	m.mu.RUnlock()

	if scenario == nil {
		m.appendLog("system !! start: no scenario yet (press c first)")
		return fmt.Errorf("create a scenario first")
	}

	m.appendLog(fmt.Sprintf("system -> start tournament_id=%d", scenario.GroupTournament.ID))
	if err := m.client.StartGroupScenario(ctx, scenario.GroupTournament.ID); err != nil {
		m.appendLog(fmt.Sprintf("system !! start failed: %v", err))
		return err
	}
	m.appendLog("system <- start ok (state=active)")

	m.mu.Lock()
	m.tournamentState = "active"
	m.mu.Unlock()

	return nil
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
	groupTournamentID := 0
	tournamentURL := ""
	slug := ""
	sliceSize := m.opts.SliceSize
	sliceStrategy := m.opts.SliceStrategy

	if m.scenario != nil {
		usersTotal = len(m.scenario.Users)
		groupTournamentID = m.scenario.GroupTournament.ID
		slug = m.scenario.GroupTournament.Slug
		sliceSize = m.scenario.GroupTournament.SliceSize
		sliceStrategy = m.scenario.GroupTournament.SliceStrategy
		tournamentURL = fmt.Sprintf(
			"%s/admin/group_tournaments/%d",
			strings.TrimRight(m.opts.ServerURL, "/"),
			groupTournamentID,
		)
	}

	scores := make([]ScoreEntry, 0, len(m.bestScores))
	for _, entry := range m.bestScores {
		scores = append(scores, entry)
	}
	sort.Slice(scores, func(i, j int) bool {
		if scores[i].Score == scores[j].Score {
			return scores[i].UserID < scores[j].UserID
		}
		return scores[i].Score > scores[j].Score
	})
	if len(scores) > 20 {
		scores = scores[:20]
	}

	return Snapshot{
		GroupTournamentID:     groupTournamentID,
		GroupTournamentURL:    tournamentURL,
		GroupTournamentSlug:   slug,
		GroupTournamentState:  m.tournamentState,
		SliceSize:             sliceSize,
		SliceStrategy:         sliceStrategy,
		UsersTotal:            usersTotal,
		ChannelConnected:      int(m.channelConnected.Load()),
		SolutionsSubmitted:    int(m.solutionsSubmitted.Load()),
		RunsOk:                int(m.runsOk.Load()),
		RunsError:             int(m.runsError.Load()),
		FailedEvents:          int(m.failedEvents.Load()),
		BestScores:            scores,
		Logs:                  append([]string(nil), m.logs...),
		DefaultBehaviorByLang: behaviors,
	}
}

func (m *Master) SetLanguage(target, lang string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	pool := m.defaultBehavior[lang].SolutionPool
	if target == "all" {
		for _, worker := range m.workers {
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.Lang = lang
				b.SolutionPool = pool
				return b
			})
		}
		return nil
	}

	worker := m.getWorkerLocked(target)
	if worker == nil {
		return fmt.Errorf("worker %s not found", target)
	}
	worker.UpdateBehavior(func(b Behavior) Behavior {
		b.Lang = lang
		b.SolutionPool = pool
		return b
	})
	return nil
}

func (m *Master) SetSpeed(target string, delayMS int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if delayMS < 1000 {
		m.opts.AvgSubmitSeconds = 1
	} else {
		m.opts.AvgSubmitSeconds = delayMS / 1000
	}
	if target == "all" {
		for key, behavior := range m.defaultBehavior {
			behavior.SubmitDelayMS = delayMS
			m.defaultBehavior[key] = behavior
		}
		for _, worker := range m.workers {
			worker.UpdateBehavior(func(b Behavior) Behavior {
				b.SubmitDelayMS = delayMS
				return b
			})
		}
		return nil
	}
	worker := m.getWorkerLocked(target)
	if worker == nil {
		return fmt.Errorf("worker %s not found", target)
	}
	worker.UpdateBehavior(func(b Behavior) Behavior {
		b.SubmitDelayMS = delayMS
		return b
	})
	return nil
}

func (m *Master) Pause(target string, paused bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
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
		return nil
	}

	worker := m.getWorkerLocked(target)
	if worker == nil {
		return fmt.Errorf("worker %s not found", target)
	}
	worker.UpdateBehavior(func(b Behavior) Behavior {
		b.Paused = paused
		return b
	})
	return nil
}

func (m *Master) recordRunResult(user extapi.GroupScenarioUser, status string, score int) {
	switch status {
	case "success":
		m.runsOk.Add(1)
	case "error":
		m.runsError.Add(1)
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	current, ok := m.bestScores[user.UserID]
	if !ok || score > current.Score {
		m.bestScores[user.UserID] = ScoreEntry{
			UserID: user.UserID,
			Name:   user.Name,
			Lang:   user.Lang,
			Score:  score,
		}
	}
}

func (m *Master) getWorkerLocked(target string) *Worker {
	if target == "all" {
		return nil
	}
	var userID int
	_, _ = fmt.Sscanf(target, "%d", &userID)
	return m.workers[userID]
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
	m.channelConnected.Store(0)
	m.solutionsSubmitted.Store(0)
	m.runsOk.Store(0)
	m.runsError.Store(0)
	m.failedEvents.Store(0)
	m.logs = nil
}

func (m *Master) AppendLog(line string) {
	m.appendLog(line)
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

func (m *Master) rebuildDefaultBehaviorsLocked() {
	pythonPool := loadSolutionPool(m.opts.PythonSolutionsDir, DefaultPythonSolution)
	cppPool := loadSolutionPool(m.opts.CPPSolutionsDir, DefaultCPPSolution)

	submitDelayMS := m.opts.AvgSubmitSeconds * 1000
	if submitDelayMS <= 0 {
		submitDelayMS = 20_000
	}
	m.defaultBehavior["python"] = Behavior{
		Lang:              "python",
		SolutionPool:      pythonPool,
		SubmitDelayMS:     submitDelayMS,
		RandomnessPercent: m.opts.RandomnessPercent,
	}
	m.defaultBehavior["cpp"] = Behavior{
		Lang:              "cpp",
		SolutionPool:      cppPool,
		SubmitDelayMS:     submitDelayMS,
		RandomnessPercent: m.opts.RandomnessPercent,
	}
}

func loadSolutionPool(dir, fallback string) []string {
	if dir == "" {
		return []string{fallback}
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return []string{fallback}
	}
	var pool []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}
		text := strings.TrimSpace(string(data))
		if text == "" {
			continue
		}
		pool = append(pool, string(data))
	}
	if len(pool) == 0 {
		return []string{fallback}
	}
	return pool
}

func (m *Master) behaviorForLang(lang string) Behavior {
	m.mu.RLock()
	defer m.mu.RUnlock()
	behavior, ok := m.defaultBehavior[lang]
	if !ok {
		behavior = Behavior{
			Lang:              lang,
			SubmitDelayMS:     m.opts.AvgSubmitSeconds * 1000,
			RandomnessPercent: m.opts.RandomnessPercent,
		}
	}
	return behavior
}
