package ui

import (
	"context"
	_ "embed"
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/hexlet-codebattle/dima/internal/runtime"
)

//go:embed dima.txt
var dimaArt string

type Console struct {
	master *runtime.Master
}

func NewConsole(master *runtime.Master) *Console {
	return &Console{master: master}
}

func (c *Console) Run(ctx context.Context) error {
	model := newModel(ctx, c.master)
	prog := tea.NewProgram(model, tea.WithAltScreen(), tea.WithContext(ctx))
	_, err := prog.Run()
	return err
}

type tickMsg time.Time
type statusMsg string
type errMsg error

type model struct {
	ctx      context.Context
	master   *runtime.Master
	snapshot runtime.Snapshot
	width    int
	height   int
	status   string
	lastErr  string
}

func newModel(ctx context.Context, master *runtime.Master) model {
	return model{
		ctx:      ctx,
		master:   master,
		snapshot: master.Snapshot(),
	}
}

func (m model) Init() tea.Cmd {
	return tickCmd()
}

func tickCmd() tea.Cmd {
	return tea.Tick(500*time.Millisecond, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	case tickMsg:
		m.snapshot = m.master.Snapshot()
		return m, tickCmd()
	case statusMsg:
		m.status = string(msg)
		m.lastErr = ""
	case errMsg:
		if msg != nil {
			m.lastErr = msg.Error()
			m.status = ""
		}
	case tea.KeyMsg:
		return m.handleKey(msg)
	}
	return m, nil
}

func (m model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit
	case "c":
		return m.dispatch("creating scenario...", func() error { return m.master.CreateScenario(m.ctx) })
	case "j":
		return m.dispatch("joining workers...", func() error { return m.master.JoinScenario(m.ctx) })
	case "s":
		return m.dispatch("starting tournament...", func() error { return m.master.StartScenario(m.ctx) })
	case "1":
		return m.dispatch("language=python", func() error { return m.master.SetLanguage("all", "python") })
	case "2":
		return m.dispatch("language=cpp", func() error { return m.master.SetLanguage("all", "cpp") })
	case "p":
		return m.dispatch("paused", func() error { return m.master.Pause("all", true) })
	case "u":
		return m.dispatch("resumed", func() error { return m.master.Pause("all", false) })
	case "+", "=":
		delay := m.snapshot.DefaultBehaviorByLang["python"].SubmitDelayMS + 1000
		return m.dispatch(fmt.Sprintf("submit delay=%dms", delay), func() error { return m.master.SetSpeed("all", delay) })
	case "-":
		delay := m.snapshot.DefaultBehaviorByLang["python"].SubmitDelayMS - 1000
		if delay < 1000 {
			delay = 1000
		}
		return m.dispatch(fmt.Sprintf("submit delay=%dms", delay), func() error { return m.master.SetSpeed("all", delay) })
	}
	return m, nil
}

func (m model) dispatch(status string, fn func() error) (tea.Model, tea.Cmd) {
	m.status = status
	m.lastErr = ""
	m.master.AppendLog("ui -> " + status)
	return m, runCmd(fn)
}

func runCmd(fn func() error) tea.Cmd {
	return func() tea.Msg {
		if err := fn(); err != nil {
			return errMsg(err)
		}
		return statusMsg("ok")
	}
}

var (
	bgColor    = lipgloss.Color("#000000")
	redColor   = lipgloss.Color("#FF0000")
	blueColor  = lipgloss.Color("#5FA8D3")
	greenColor = lipgloss.Color("#22B14C")

	rootStyle   = lipgloss.NewStyle().Background(bgColor).Foreground(redColor)
	titleStyle  = lipgloss.NewStyle().Bold(true).Foreground(redColor).Background(bgColor)
	labelStyle  = lipgloss.NewStyle().Foreground(redColor).Background(bgColor)
	valueStyle  = lipgloss.NewStyle().Bold(true).Foreground(redColor).Background(bgColor)
	errorStyle  = lipgloss.NewStyle().Bold(true).Foreground(redColor).Background(bgColor)
	statusStyle = lipgloss.NewStyle().Bold(true).Foreground(greenColor).Background(bgColor)
	logLineSty  = lipgloss.NewStyle().Foreground(redColor).Background(bgColor)
	headerStyle = lipgloss.NewStyle().Bold(true).Foreground(blueColor).Background(bgColor)
)

func (m model) View() string {
	settings := m.renderSettings()
	keys := labelStyle.Render("keys: c=create j=join s=start 1=python 2=cpp p=pause u=unpause +/-=speed q=quit")

	settingsH := lipgloss.Height(settings)
	keysH := lipgloss.Height(keys)

	logsHeight := 12
	if m.height > 0 {
		logsHeight = m.height - settingsH - keysH - 2
	}
	if logsHeight < 3 {
		logsHeight = 3
	}

	logs := m.renderLogs(logsHeight)
	rawLeft := settings + "\n" + logs + "\n" + keys
	left := fillBg(rawLeft, lipgloss.Width(rawLeft))

	right := renderArt(0, m.height)

	if m.width > 0 && m.width < lipgloss.Width(left)+lipgloss.Width(right)+4 {
		return left
	}

	spacer := rootStyle.Render("  ")
	return lipgloss.JoinHorizontal(lipgloss.Top, left, spacer, right)
}

// fillBg pads each line of the rendered string to width with black-bg spaces.
// This is the only reliable way to make terminal cells without printable
// glyphs (gaps inside styled output) inherit the panel's black background.
func fillBg(s string, width int) string {
	lines := strings.Split(s, "\n")
	pad := lipgloss.NewStyle().Background(bgColor).Foreground(redColor)
	for i, line := range lines {
		w := lipgloss.Width(line)
		if w < width {
			lines[i] = line + pad.Render(strings.Repeat(" ", width-w))
		}
	}
	return strings.Join(lines, "\n")
}

func renderArt(_ int, maxHeight int) string {
	lines := strings.Split(strings.TrimRight(dimaArt, "\n"), "\n")
	if maxHeight > 0 && len(lines) > maxHeight {
		lines = lines[len(lines)-maxHeight:]
	}
	const width = 80
	subject := lipgloss.NewStyle().Foreground(redColor).Background(bgColor)
	blank := lipgloss.NewStyle().Foreground(bgColor).Background(bgColor)

	out := make([]string, 0, len(lines))
	for _, line := range lines {
		padded := line
		if len(padded) < width {
			padded += strings.Repeat(" ", width-len(padded))
		}
		var lb strings.Builder
		for _, r := range padded {
			if isSubjectChar(r) {
				lb.WriteString(subject.Render(string(r)))
			} else {
				lb.WriteString(blank.Render(string(r)))
			}
		}
		out = append(out, lb.String())
	}
	return strings.Join(out, "\n")
}

// Anything that draws an "ink" cell counts as subject; whitespace stays black.
// Source ASCII is expected to come from a background-removed photo so this
// rule produces a clean red silhouette.
func isSubjectChar(r rune) bool {
	return r != ' '
}

func (m model) renderSettings() string {
	s := m.snapshot
	var b strings.Builder

	b.WriteString(titleStyle.Render("Group Tournament Load Generator"))
	b.WriteString("\n\n")

	b.WriteString(headerStyle.Render("Tournament") + "\n")
	b.WriteString(kv("id", fmt.Sprintf("%d", s.GroupTournamentID)))
	b.WriteString(kv("slug", s.GroupTournamentSlug))
	b.WriteString(kv("state", s.GroupTournamentState))
	b.WriteString(kv("slice", fmt.Sprintf("%d (%s)", s.SliceSize, s.SliceStrategy)))
	if s.GroupTournamentURL != "" {
		b.WriteString(kv("url", s.GroupTournamentURL))
	}
	b.WriteString("\n")

	b.WriteString(headerStyle.Render("Counters") + "\n")
	b.WriteString(kv("users", fmt.Sprintf("%d", s.UsersTotal)))
	b.WriteString(kv("connected", fmt.Sprintf("%d", s.ChannelConnected)))
	b.WriteString(kv("submitted", fmt.Sprintf("%d", s.SolutionsSubmitted)))
	b.WriteString(kv("runs ok", fmt.Sprintf("%d", s.RunsOk)))
	b.WriteString(kv("runs error", fmt.Sprintf("%d", s.RunsError)))
	b.WriteString(kv("failed events", fmt.Sprintf("%d", s.FailedEvents)))
	b.WriteString("\n")

	if py, ok := s.DefaultBehaviorByLang["python"]; ok {
		b.WriteString(kv("python delay (ms) / pool", fmt.Sprintf("%d / %d files", py.SubmitDelayMS, len(py.SolutionPool))))
	}
	if cpp, ok := s.DefaultBehaviorByLang["cpp"]; ok {
		b.WriteString(kv("cpp delay (ms) / pool", fmt.Sprintf("%d / %d files", cpp.SubmitDelayMS, len(cpp.SolutionPool))))
	}

	if m.lastErr != "" {
		b.WriteString("\n" + errorStyle.Render("error: "+m.lastErr))
	} else if m.status != "" {
		b.WriteString("\n" + statusStyle.Render("status: "+m.status))
	}

	return b.String()
}

func (m model) renderLogs(maxHeight int) string {
	if maxHeight <= 0 {
		return ""
	}

	s := m.snapshot
	var b strings.Builder
	b.WriteString(headerStyle.Render("Logs"))
	b.WriteString("\n")

	body := maxHeight - 1
	if body < 1 {
		return b.String()
	}

	shown := s.Logs
	if len(shown) > body {
		shown = shown[len(shown)-body:]
	}
	for _, line := range shown {
		b.WriteString(logLineSty.Render("  " + line))
		b.WriteString("\n")
	}
	for range body - len(shown) {
		b.WriteString("\n")
	}
	return strings.TrimRight(b.String(), "\n")
}

func kv(label, value string) string {
	return labelStyle.Render("  "+label+": ") + valueStyle.Render(value) + "\n"
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}
