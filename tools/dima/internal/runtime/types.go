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
	AvgSubmitSeconds   int
	RandomnessPercent  int
	JoinRampSeconds    int
	LangMix            []string
	PythonSolutionsDir string
	CPPSolutionsDir    string
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
	SliceSize             int
	SliceStrategy         string
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
