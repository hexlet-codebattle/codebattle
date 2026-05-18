package runtime

import "strings"

type Options struct {
	ServerURL          string
	AuthKey            string
	UsersCount         int
	GroupTaskID        int
	RunnerURL          string
	SliceSize          int
	SliceStrategy      string
	RoundTimeoutSeconds int
	AvgSubmitSeconds   int
	RandomnessPercent  int
	JoinRampSeconds    int
	LangMix            []string
	PythonSolutionsDir string
	CPPSolutionsDir    string
	// Ranked-tournament knobs. When TournamentType is "ranked", the server
	// uses seeding round + slice cascade. Otherwise (default "individual"),
	// the legacy single-round behaviour applies.
	TournamentType   string
	RoundsCount      int
	MaxScore         int
	ScoringStrategy  string
	MovementStrategy string
	PlaceWeight      int
	IncludeBots      bool
	IncludeBotsSet   bool
}

type Behavior struct {
	Lang              string
	SolutionPool      []string
	SubmitDelayMS     int
	RandomnessPercent int
	Paused            bool
}

type Snapshot struct {
	GroupTournamentID     int
	GroupTournamentURL    string
	GroupTournamentSlug   string
	GroupTournamentState  string
	TournamentType        string
	SliceSize             int
	SliceStrategy         string
	RoundTimeoutSeconds   int
	RoundsCount           int
	CurrentRoundPosition  int
	MaxScore              int
	ScoringStrategy       string
	MovementStrategy      string
	PlaceWeight           int
	IncludeBots           bool
	IncludeBotsKnown      bool
	UsersTotal            int
	ChannelConnected      int
	SolutionsSubmitted    int
	RunsOk                int
	RunsError             int
	FailedEvents          int
	BestScores            []ScoreEntry
	Logs                  []string
	DefaultBehaviorByLang map[string]Behavior
}

type ScoreEntry struct {
	UserID int
	Name   string
	Lang   string
	Score  int
}

func ParseLangMix(value string) []string {
	var langs []string
	for _, part := range strings.Split(value, ",") {
		part = strings.TrimSpace(part)
		if part != "" {
			langs = append(langs, part)
		}
	}
	if len(langs) == 0 {
		return []string{"python", "cpp"}
	}
	return langs
}
