package ui

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/hexlet-codebattle/ars/internal/config"
	"github.com/hexlet-codebattle/ars/internal/runtime"
)

type Console struct {
	master *runtime.Master
}

type viewMode int

const (
	splashMode viewMode = iota
	settingsMode
	dashboardMode
)

type tickMsg time.Time
type snapshotMsg runtime.Snapshot
type statusMsg struct {
	text string
	err  error
}

type model struct {
	ctx        context.Context
	master     *runtime.Master
	mode       viewMode
	width      int
	height     int
	frame      int
	focusIndex int
	loading    bool
	status     string
	snapshot   runtime.Snapshot
	logOffset  int
	inputs     []textinput.Model
}

var (
	rootStyle  = lipgloss.NewStyle()
	panelStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#4ADE80")).
			Padding(1, 2)
	fieldStyle = lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color("#166534")).
			Padding(0, 1)
	titleStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#BBF7D0")).Bold(true)
	mutedStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#86EFAC"))
	okStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("#DCFCE7")).Bold(true)
	errStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("#FCA5A5")).Bold(true)
	accentStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#4ADE80")).Bold(true)
)

const matrixBG = "spaceTLECODEBATTLECODEBATTLECODEBATTLECODEBATTLECODEBATTLECODEBATTLECODEBATTLEC"

func NewConsole(master *runtime.Master) *Console {
	return &Console{master: master}
}

func (c *Console) Run(ctx context.Context) error {
	defaults := c.master.Options()
	m := newModel(ctx, c.master, defaults)

	program := tea.NewProgram(m, tea.WithAltScreen())
	_, err := program.Run()
	return err
}

func newModel(ctx context.Context, master *runtime.Master, opts runtime.Options) model {
	inputs := []textinput.Model{
		newInput("Server URL", opts.ServerURL),
		newInput("Auth Key", opts.AuthKey),
		newInput("Users", strconv.Itoa(opts.UsersCount)),
		newInput("Rounds", strconv.Itoa(opts.RoundsLimit)),
		newInput("Break Sec", strconv.Itoa(opts.BreakDurationSeconds)),
		newInput("Avg Task Sec", strconv.Itoa(opts.AvgTaskSeconds)),
		newInput("Randomness %", strconv.Itoa(opts.RandomnessPercent)),
		newInput("Join Ramp Sec", strconv.Itoa(opts.JoinRampSeconds)),
		newInput("Languages", strings.Join(opts.LangMix, ",")),
	}
	inputs[1].EchoMode = textinput.EchoPassword
	inputs[1].EchoCharacter = '•'
	inputs[0].Focus()

	return model{
		ctx:    ctx,
		master: master,
		mode:   splashMode,
		status: "Press Enter if you want to have fun",
		inputs: inputs,
	}
}

func newInput(placeholder, value string) textinput.Model {
	ti := textinput.New()
	ti.Placeholder = placeholder
	ti.SetValue(value)
	ti.Prompt = "• "
	ti.Width = 36
	ti.Cursor.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("#DCFCE7"))
	ti.TextStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#DCFCE7"))
	ti.PromptStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#4ADE80"))
	return ti
}

func (m model) Init() tea.Cmd {
	return tea.Batch(tickCmd(), snapshotCmd(m.master))
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	select {
	case <-m.ctx.Done():
		return m, tea.Quit
	default:
	}

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	case tickMsg:
		m.frame++
		return m, tickCmd()
	case snapshotMsg:
		m.snapshot = runtime.Snapshot(msg)
		return m, snapshotCmd(m.master)
	case statusMsg:
		if msg.err != nil {
			m.status = errStyle.Render(msg.err.Error())
		} else {
			m.status = okStyle.Render(msg.text)
		}
		m.loading = false
		return m, nil
	case tea.KeyMsg:
		switch m.mode {
		case splashMode:
			switch msg.String() {
			case "ctrl+c", "q":
				return m, tea.Quit
			case "enter", " ":
				m.mode = settingsMode
				m.status = "Load defaults from .env or edit fields, then press Enter"
			}
			return m, nil
		case settingsMode:
			return m.updateSettings(msg)
		default:
			return m.updateDashboard(msg)
		}
	}

	return m, nil
}

func (m model) updateSettings(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "tab", "shift+tab", "up", "down":
		if msg.String() == "up" || msg.String() == "shift+tab" {
			m.focusIndex--
		} else {
			m.focusIndex++
		}
		if m.focusIndex > len(m.inputs)-1 {
			m.focusIndex = 0
		}
		if m.focusIndex < 0 {
			m.focusIndex = len(m.inputs) - 1
		}
		for i := range m.inputs {
			if i == m.focusIndex {
				m.inputs[i].Focus()
			} else {
				m.inputs[i].Blur()
			}
		}
		return m, nil
	case "ctrl+r":
		m.applyDefaults(config.LoadDefaults())
		m.status = okStyle.Render("Reloaded settings from root .env")
		return m, nil
	case "enter":
		opts, err := m.optionsFromInputs()
		if err != nil {
			m.status = errStyle.Render(err.Error())
			return m, nil
		}
		m.master.UpdateOptions(opts)
		m.mode = dashboardMode
		m.status = okStyle.Render("Dashboard ready. Press c to create a scenario, then j to join users.")
		return m, nil
	}

	cmds := make([]tea.Cmd, len(m.inputs))
	for i := range m.inputs {
		m.inputs[i], cmds[i] = m.inputs[i].Update(msg)
	}
	return m, tea.Batch(cmds...)
}

func (m model) updateDashboard(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "e":
		m.mode = settingsMode
		m.status = "Settings mode. Tab between fields, Enter to return."
		return m, nil
	case "up":
		if m.logOffset < len(m.snapshot.Logs)-1 {
			m.logOffset++
		}
		return m, nil
	case "down":
		if m.logOffset > 0 {
			m.logOffset--
		}
		return m, nil
	case "pgup":
		m.logOffset += 10
		if m.logOffset > len(m.snapshot.Logs)-1 {
			m.logOffset = max(0, len(m.snapshot.Logs)-1)
		}
		return m, nil
	case "pgdown":
		m.logOffset -= 10
		if m.logOffset < 0 {
			m.logOffset = 0
		}
		return m, nil
	case "c":
		m.loading = true
		return m, actionCmd(func() error {
			return m.master.CreateScenario(m.ctx)
		}, "Scenario created. Press j to join users.")
	case "j":
		m.loading = true
		return m, actionCmd(func() error {
			return m.master.JoinScenario(m.ctx)
		}, "Users joined tournament")
	case "s":
		m.loading = true
		return m, actionCmd(func() error {
			return m.master.StartScenario(m.ctx)
		}, "Tournament started")
	case "p":
		return m, actionCmd(func() error {
			return m.master.Pause("all", true)
		}, "All workers paused")
	case "u":
		return m, actionCmd(func() error {
			return m.master.Pause("all", false)
		}, "All workers resumed")
	case "1":
		return m, actionCmd(func() error {
			return m.master.SetLanguage("all", "python")
		}, "All workers switched to python")
	case "2":
		return m, actionCmd(func() error {
			return m.master.SetLanguage("all", "cpp")
		}, "All workers switched to cpp")
	case "+":
		return m, m.bumpSpeed(-100)
	case "-":
		return m, m.bumpSpeed(100)
	case "r":
		m.applyDefaults(config.LoadDefaults())
		return m, actionCmd(func() error {
			return nil
		}, "Reloaded defaults from .env")
	case "f":
		return m, m.bumpSpeed(-1000)
	case "w":
		return m, m.bumpSpeed(1000)
	}
	return m, nil
}

func (m model) View() string {
	width := max(m.width, 100)
	height := max(m.height, 32)

	switch m.mode {
	case splashMode:
		return renderFullScreen(width, height, m.renderSplash(width, height))
	case settingsMode:
		return renderFullScreen(width, height, m.renderSettings(width, height))
	default:
		return renderFullScreen(width, height, m.renderDashboard(width, height))
	}
}

func (m model) renderSplash(width, height int) string {
	panelWidth := min(122, max(72, width-18))
	innerWidth := max(60, panelWidth-6)
	heroStyle := lipgloss.NewStyle().
		Width(panelWidth).
		Border(lipgloss.DoubleBorder()).
		BorderForeground(lipgloss.Color("#4ADE80")).
		Padding(1, 3)
	chipStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#DCFCE7")).
		Background(lipgloss.Color("#14532D")).
		Padding(0, 1).
		Bold(true)

	badges := centerText(innerWidth, strings.Join([]string{
		chipStyle.Render("LIVE METRICS"),
		chipStyle.Render("WORKER CONTROL"),
		chipStyle.Render("TASK SYNC"),
		chipStyle.Render("LATENCY TUNING"),
	}, "  "))

	hero := heroStyle.Render(lipgloss.JoinVertical(
		lipgloss.Center,
		centerText(innerWidth, renderARS(m.frame)),
		"",
		badges,
		"",
		centerText(innerWidth, okStyle.Render("Press Enter to access the control surface")),
		centerText(innerWidth, mutedStyle.Render("Space also works  •  Ctrl+C exits cleanly")),
	))

	footer := centerText(panelWidth, mutedStyle.Render("Codebattle load test tool"))
	body := lipgloss.JoinVertical(lipgloss.Center, hero, "", footer)
	return renderSplashWithMatrix(width, height, body, m.frame)
}

func (m model) renderSettings(width, height int) string {
	header := m.renderHeader("SETUP")
	panelWidth := min(82, max(66, width-20))
	rows := make([]string, 0, len(m.inputs))
	for i, input := range m.inputs {
		label := []string{"Server URL", "Auth Key", "Users", "Rounds", "Break Sec", "Avg Task Sec", "Randomness %", "Join Ramp Sec", "Languages"}[i]
		field := lipgloss.JoinVertical(
			lipgloss.Left,
			titleStyle.Render(label),
			fieldStyle.Width(40).Render(input.View()),
		)
		rows = append(rows, centerText(panelWidth-4, field))
	}

	eyebrow := centerText(panelWidth-4, mutedStyle.Render("Tournament bootstrap settings"))
	help := centerText(panelWidth-4, mutedStyle.Render("Tab/Shift+Tab  •  Ctrl+R reload .env  •  Enter continue  •  Ctrl+C quit"))
	content := panelStyle.
		Width(panelWidth).
		Render(lipgloss.JoinVertical(
			lipgloss.Left,
			eyebrow,
			"",
			strings.Join(rows, "\n\n"),
		))
	footer := centerText(panelWidth, m.renderStatus())

	body := lipgloss.JoinVertical(
		lipgloss.Center,
		header,
		"",
		content,
		"",
		help,
		"",
		footer,
	)
	return renderScreenWithMatrix(width, height, lipgloss.NewStyle().MarginTop(2).Render(body), m.frame)
}

func (m model) renderDashboard(width, height int) string {
	header := m.renderHeader("DASHBOARD")
	stats := m.snapshot
	panelWidth := max(44, (width-10)/2)

	left := panelStyle.Width(panelWidth).Render(strings.Join([]string{
		titleStyle.Render("Cluster Snapshot"),
		metricRow("Tournament", tournamentValue(stats)),
		metricRow("State", blankFallback(stats.TournamentState)),
		metricRow("Break", blankFallback(stats.TournamentBreakState)),
		metricRow("Users", strconv.Itoa(stats.UsersTotal)),
		metricRow("Tournament Sockets", strconv.Itoa(stats.TournamentConnected)),
		metricRow("Active Games", strconv.Itoa(stats.ActiveGames)),
		metricRow("Completed Games", strconv.Itoa(stats.CompletedGames)),
		metricRow("Failed Events", strconv.Itoa(stats.FailedEvents)),
		metricRow("Last Task ID", strconv.Itoa(stats.LastRoundTaskID)),
		metricRow("Task Name", blankFallback(stats.LastTaskName)),
	}, "\n"))

	opts := m.master.Options()
	right := panelStyle.Width(panelWidth).Render(strings.Join([]string{
		titleStyle.Render("Runtime Controls"),
		metricRow("Server", opts.ServerURL),
		metricRow("Users Target", strconv.Itoa(opts.UsersCount)),
		metricRow("Rounds", strconv.Itoa(opts.RoundsLimit)),
		metricRow("Break", fmt.Sprintf("%d sec", opts.BreakDurationSeconds)),
		metricRow("Avg Solve", fmt.Sprintf("%d sec", opts.AvgTaskSeconds)),
		metricRow("Randomness", fmt.Sprintf("%d%%", opts.RandomnessPercent)),
		metricRow("Join Ramp", fmt.Sprintf("%d sec", opts.JoinRampSeconds)),
		metricRow("Languages", strings.Join(opts.LangMix, ",")),
		"",
		mutedStyle.Render("c create   j join       s start"),
		mutedStyle.Render("1 python   2 cpp        f faster"),
		mutedStyle.Render("p pause    u resume     w slower"),
		mutedStyle.Render("r reload .env"),
		mutedStyle.Render("q quit"),
	}, "\n"))

	grid := lipgloss.JoinHorizontal(lipgloss.Top, left, "  ", right)
	status := m.renderStatus()
	bottomPanelWidth := max(44, (width-10)/2)
	usedHeight := lipgloss.Height(header) + 2 + lipgloss.Height(grid) + 2 + lipgloss.Height(status)
	logHeight := max(8, height-usedHeight-8)
	logPanel := panelStyle.Width(bottomPanelWidth).Render(strings.Join([]string{
		titleStyle.Render("Event Log"),
		renderLogLines(stats.Logs, bottomPanelWidth-6, logHeight, m.logOffset),
	}, "\n"))
	rankingPanel := panelStyle.Width(bottomPanelWidth).Render(strings.Join([]string{
		titleStyle.Render("Ranking"),
		renderRankingLines(stats.Ranking, bottomPanelWidth-6, logHeight),
	}, "\n"))
	bottomGrid := lipgloss.JoinHorizontal(lipgloss.Top, logPanel, "  ", rankingPanel)

	body := lipgloss.JoinVertical(lipgloss.Left, header, "", grid, "", bottomGrid, "", status)
	return renderScreenWithMatrix(width, height, lipgloss.NewStyle().MarginTop(2).MarginLeft(3).Render(body), m.frame)
}

func (m model) renderHeader(mode string) string {
	ars := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#DCFCE7")).Render("ARS")
	modeTag := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#86EFAC")).Render(mode)
	tag := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#4ADE80")).Render("CODEBATTLE LOAD TEST TOOL")
	return lipgloss.JoinHorizontal(lipgloss.Center, ars, "  ", modeTag, "  ", tag)
}

func (m model) renderStatus() string {
	if m.loading {
		return okStyle.Render("Working" + strings.Repeat(".", m.frame%4))
	}
	if strings.TrimSpace(m.status) == "" {
		return mutedStyle.Render("Ready")
	}
	return m.status
}

func (m *model) applyDefaults(opts runtime.Options) {
	m.master.UpdateOptions(opts)
	m.inputs[0].SetValue(opts.ServerURL)
	m.inputs[1].SetValue(opts.AuthKey)
	m.inputs[2].SetValue(strconv.Itoa(opts.UsersCount))
	m.inputs[3].SetValue(strconv.Itoa(opts.RoundsLimit))
	m.inputs[4].SetValue(strconv.Itoa(opts.BreakDurationSeconds))
	m.inputs[5].SetValue(strconv.Itoa(opts.AvgTaskSeconds))
	m.inputs[6].SetValue(strconv.Itoa(opts.RandomnessPercent))
	m.inputs[7].SetValue(strconv.Itoa(opts.JoinRampSeconds))
	m.inputs[8].SetValue(strings.Join(opts.LangMix, ","))
}

func (m model) optionsFromInputs() (runtime.Options, error) {
	users, err := strconv.Atoi(strings.TrimSpace(m.inputs[2].Value()))
	if err != nil || users <= 0 {
		return runtime.Options{}, fmt.Errorf("users must be a positive integer")
	}

	rounds, err := strconv.Atoi(strings.TrimSpace(m.inputs[3].Value()))
	if err != nil || rounds <= 0 {
		return runtime.Options{}, fmt.Errorf("rounds must be a positive integer")
	}

	breakSeconds, err := strconv.Atoi(strings.TrimSpace(m.inputs[4].Value()))
	if err != nil || breakSeconds < 0 {
		return runtime.Options{}, fmt.Errorf("break seconds must be zero or positive")
	}

	avgTaskSeconds, err := strconv.Atoi(strings.TrimSpace(m.inputs[5].Value()))
	if err != nil || avgTaskSeconds <= 0 {
		return runtime.Options{}, fmt.Errorf("avg task seconds must be a positive integer")
	}

	randomness, err := strconv.Atoi(strings.TrimSpace(m.inputs[6].Value()))
	if err != nil || randomness < 0 {
		return runtime.Options{}, fmt.Errorf("randomness must be zero or positive")
	}

	joinRampSeconds, err := strconv.Atoi(strings.TrimSpace(m.inputs[7].Value()))
	if err != nil || joinRampSeconds < 0 {
		return runtime.Options{}, fmt.Errorf("join ramp seconds must be zero or positive")
	}

	return runtime.Options{
		ServerURL:            strings.TrimSpace(m.inputs[0].Value()),
		AuthKey:              strings.TrimSpace(m.inputs[1].Value()),
		UsersCount:           users,
		RoundsLimit:          rounds,
		BreakDurationSeconds: breakSeconds,
		AvgTaskSeconds:       avgTaskSeconds,
		RandomnessPercent:    randomness,
		JoinRampSeconds:      joinRampSeconds,
		LangMix:              runtime.ParseLangMix(m.inputs[8].Value()),
	}, nil
}

func (m model) bumpSpeed(delta int) tea.Cmd {
	speed := inferSpeed(m.snapshot.DefaultBehaviorByLang) + delta
	if speed < 1000 {
		speed = 1000
	}
	m.loading = true
	return actionCmd(func() error {
		return m.master.SetSpeed("all", speed)
	}, fmt.Sprintf("Average solve time set to %d sec", speed/1000))
}

func actionCmd(fn func() error, okText string) tea.Cmd {
	return func() tea.Msg {
		if err := fn(); err != nil {
			return statusMsg{err: err}
		}
		return statusMsg{text: okText}
	}
}

func snapshotCmd(master *runtime.Master) tea.Cmd {
	return tea.Tick(500*time.Millisecond, func(time.Time) tea.Msg {
		return snapshotMsg(master.Snapshot())
	})
}

func tickCmd() tea.Cmd {
	return tea.Tick(120*time.Millisecond, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func metricRow(label, value string) string {
	return lipgloss.JoinHorizontal(lipgloss.Top, mutedStyle.Width(18).Render(label), lipgloss.NewStyle().Bold(true).Render(value))
}

func tournamentValue(stats runtime.Snapshot) string {
	if stats.TournamentURL != "" {
		return stats.TournamentURL
	}

	return strconv.Itoa(stats.TournamentID)
}

func inferSpeed(behaviors map[string]runtime.Behavior) int {
	for _, behavior := range behaviors {
		return behavior.TypingDelayMS
	}
	return 1200
}

func renderLogLines(lines []string, width, height, offset int) string {
	if height <= 0 {
		height = 1
	}

	if len(lines) == 0 {
		return lipgloss.NewStyle().Height(height).Foreground(lipgloss.Color("#86EFAC")).Render("No events yet")
	}

	if offset < 0 {
		offset = 0
	}
	if offset > len(lines)-1 {
		offset = len(lines) - 1
	}

	end := len(lines) - offset
	if end < 0 {
		end = 0
	}
	start := max(0, end-height)
	if end < start {
		end = start
	}

	rendered := make([]string, 0, end-start)
	style := lipgloss.NewStyle().Width(width).Foreground(lipgloss.Color("#DCFCE7"))
	for _, line := range lines[start:end] {
		rendered = append(rendered, style.Render(line))
	}
	return lipgloss.NewStyle().Height(height).Render(strings.Join(rendered, "\n"))
}

func renderRankingLines(entries []runtime.RankingEntry, width, height int) string {
	if height <= 0 {
		height = 1
	}

	if len(entries) == 0 {
		return lipgloss.NewStyle().Height(height).Foreground(lipgloss.Color("#86EFAC")).Render("No ranking data yet")
	}

	lines := make([]string, 0, min(height, len(entries)))
	for _, entry := range entries {
		line := fmt.Sprintf("#%-3d %-18s %5d", entry.Place, trimRight(entry.Name, 18), entry.Score)
		lines = append(lines, lipgloss.NewStyle().Width(width).Foreground(lipgloss.Color("#DCFCE7")).Render(line))
		if len(lines) == height {
			break
		}
	}

	return lipgloss.NewStyle().Height(height).Render(strings.Join(lines, "\n"))
}

func animatedColor(frame int) lipgloss.Color {
	palette := []lipgloss.Color{"#38BDF8", "#60A5FA", "#22D3EE", "#34D399"}
	return palette[frame%len(palette)]
}

func matrixColor(frame int) lipgloss.Color {
	palette := []lipgloss.Color{"#22C55E", "#4ADE80", "#16A34A", "#86EFAC"}
	return palette[frame%len(palette)]
}

func renderARS(frame int) string {
	_ = frame
	return lipgloss.NewStyle().
		Foreground(lipgloss.Color("#BBF7D0")).
		Bold(true).
		Render(`       d8888 8888888b.   .d8888b.  
      d88888 888   Y88b d88P  Y88b 
     d88P888 888    888 Y88b.      
    d88P 888 888   d88P  "Y888b.   
   d88P  888 8888888P"      "Y88b. 
  d88P   888 888 T88b         "888 
 d8888888888 888  T88b  Y88b  d88P 
d88P     888 888   T88b  "Y8888P"`)
}

func matrixChunk(word []rune, start, size int) string {
	if len(word) == 0 || size <= 0 {
		return ""
	}

	var chunk strings.Builder
	for i := 0; i < size; i++ {
		chunk.WriteRune(word[(start+i)%len(word)])
	}
	return chunk.String()
}

func renderSplashWithMatrix(width, height int, body string, frame int) string {
	return overlayBodyOnMatrix(width, height, body, frame, true)
}

func renderScreenWithMatrix(width, height int, body string, frame int) string {
	return overlayBodyOnMatrix(width, height, body, frame, false)
}

func overlayBodyOnMatrix(width, height int, body string, frame int, centerVertically bool) string {
	lines := strings.Split(body, "\n")
	bodyHeight := len(lines)
	top := 0
	if centerVertically {
		top = max(0, (height-bodyHeight)/2)
	}
	rendered := make([]string, 0, height)

	for y := 0; y < height; y++ {
		content := ""
		if y >= top && y < top+bodyHeight {
			content = lines[y-top]
		}
		if content == "" {
			rendered = append(rendered, matrixSegment(0, width, y, height, frame))
			continue
		}

		contentWidth := lipgloss.Width(content)
		leftWidth := max(0, (width-contentWidth)/2)
		rightStart := min(width, leftWidth+contentWidth)
		line := matrixSegment(0, leftWidth, y, height, frame) +
			content +
			matrixSegment(rightStart, width, y, height, frame)
		rendered = append(rendered, line)
	}

	return strings.Join(rendered, "\n")
}

func matrixSegment(startX, endX, y, height, frame int) string {
	if endX <= startX {
		return ""
	}

	var row strings.Builder
	for x := startX; x < endX; x++ {
		row.WriteString(matrixCell(x, y, height, frame))
	}
	return row.String()
}

func matrixCell(x, y, height, frame int) string {
	streamLen := 14 + (x % 18)
	head := (frame + x*8 + x/2) % (height + streamLen)
	pos := y - (head - streamLen)
	if pos < 0 || pos >= streamLen {
		if (x+y+frame)%5 != 0 {
			return lipgloss.NewStyle().Foreground(lipgloss.Color("#166534")).Render(string(matrixGlyph(x, y, frame)))
		}
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#14532D")).Render(string(matrixGlyph(x, y, frame)))
	}

	glyph := string(matrixGlyph(x, y, frame))
	switch {
	case pos == streamLen-1:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#DCFCE7")).Bold(true).Render(glyph)
	case pos >= streamLen-3:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#BBF7D0")).Render(glyph)
	case pos >= streamLen-6:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#86EFAC")).Render(glyph)
	default:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("#4ADE80")).Render(glyph)
	}
}

func matrixGlyph(x, y, frame int) rune {
	word := matrixBG
	letters := []rune(word)
	if len(letters) == 0 {
		return '0'
	}
	return letters[(y+frame+x)%len(letters)]
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func renderFullScreen(width, height int, content string) string {
	lines := strings.Split(content, "\n")
	if len(lines) > height {
		lines = lines[:height]
	}

	for _, line := range lines {
		lineWidth := lipgloss.Width(line)
		if lineWidth > width {
			line = lipgloss.NewStyle().MaxWidth(width).Render(line)
			_ = lipgloss.Width(line)
		}
	}

	return strings.Join(lines, "\n")
}

func centerText(width int, text string) string {
	if width <= 0 {
		return text
	}
	return lipgloss.PlaceHorizontal(width, lipgloss.Center, text)
}

func centerBlock(width int, lines ...string) string {
	centered := make([]string, 0, len(lines))
	for _, line := range lines {
		for _, part := range strings.Split(line, "\n") {
			centered = append(centered, centerText(width, part))
		}
	}
	return strings.Join(centered, "\n")
}

func trimRight(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	if limit <= 1 {
		return string(runes[:limit])
	}
	return string(runes[:limit-1]) + "…"
}

func blankFallback(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	return value
}
