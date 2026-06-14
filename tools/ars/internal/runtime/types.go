package runtime

import "strings"

type Options struct {
	ServerURL            string
	AuthKey              string
	UsersCount           int
	RoundsLimit          int
	BreakDurationSeconds int
	AvgTaskSeconds       int
	RandomnessPercent    int
	JoinRampSeconds      int
	LangMix              []string

	// Tournament shape — defaults pick a Swiss/easy setup so legacy callers keep working.
	TournamentType      string
	TaskProvider        string
	TaskStrategy        string
	TaskPackName        string
	Level               string
	RankingType         string
	ScoreStrategy       string
	TimeoutMode         string
	RoundTimeoutSeconds int
	PlayersLimit        int
}

type Behavior struct {
	Lang              string
	Solution          string
	TypingDelayMS     int
	SubmitDelayMS     int
	RandomnessPercent int
	Paused            bool
}

type Snapshot struct {
	TournamentID          int
	TournamentURL         string
	TournamentState       string
	TournamentBreakState  string
	UsersTotal            int
	TournamentConnected   int
	ActiveGames           int
	CompletedGames        int
	FailedEvents          int
	LastRoundTaskID       int
	LastTaskName          string
	Logs                  []string
	Ranking               []RankingEntry
	DefaultBehaviorByLang map[string]Behavior
}

type RankingEntry struct {
	ID    int
	Place int
	Name  string
	Score int
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
