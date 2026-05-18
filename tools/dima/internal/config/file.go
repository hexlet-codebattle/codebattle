package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"

	"github.com/hexlet-codebattle/dima/internal/runtime"
)

func FindConfigPath() string {
	candidates := []string{
		"dima.toml",
		"tools/dima/dima.toml",
		"../dima.toml",
		"../../tools/dima/dima.toml",
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}

type FileConfig struct {
	Server           string        `toml:"server"`
	AuthKey          string        `toml:"auth_key"`
	Users            int           `toml:"users"`
	GroupTaskID      int           `toml:"group_task_id"`
	RunnerURL        string        `toml:"runner_url"`
	SliceSize        int           `toml:"slice_size"`
	SliceStrategy    string        `toml:"slice_strategy"`
	RoundTimeoutSeconds int        `toml:"round_timeout_seconds"`
	AvgSubmitSeconds int           `toml:"avg_submit_seconds"`
	Randomness       int           `toml:"randomness"`
	JoinRampSeconds  int           `toml:"join_ramp_seconds"`
	Langs            []string      `toml:"langs"`
	Solutions        FileSolutions `toml:"solutions"`

	// Ranked tournament knobs.
	TournamentType   string `toml:"type"`
	RoundsCount      int    `toml:"rounds_count"`
	MaxScore         int    `toml:"max_score"`
	ScoringStrategy  string `toml:"scoring_strategy"`
	MovementStrategy string `toml:"movement_strategy"`
	PlaceWeight      int    `toml:"place_weight"`
	IncludeBots      *bool  `toml:"include_bots"`

	sourceDir string
}

type FileSolutions struct {
	PythonDir string `toml:"python_dir"`
	CPPDir    string `toml:"cpp_dir"`
}

func LoadFile(path string) (*FileConfig, error) {
	var cfg FileConfig
	meta, err := toml.DecodeFile(path, &cfg)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	if undecoded := meta.Undecoded(); len(undecoded) > 0 {
		return nil, fmt.Errorf("%s: unknown keys %v", path, undecoded)
	}
	if abs, err := filepath.Abs(path); err == nil {
		cfg.sourceDir = filepath.Dir(abs)
	}
	return &cfg, nil
}

func resolvePath(baseDir, p string) string {
	if p == "" || baseDir == "" {
		return p
	}
	if filepath.IsAbs(p) {
		return p
	}
	return filepath.Join(baseDir, p)
}

func ApplyFile(opts runtime.Options, cfg *FileConfig) runtime.Options {
	if cfg == nil {
		return opts
	}
	if cfg.Server != "" {
		opts.ServerURL = cfg.Server
	}
	if cfg.AuthKey != "" {
		opts.AuthKey = cfg.AuthKey
	}
	if cfg.Users > 0 {
		opts.UsersCount = cfg.Users
	}
	if cfg.GroupTaskID > 0 {
		opts.GroupTaskID = cfg.GroupTaskID
	}
	if cfg.RunnerURL != "" {
		opts.RunnerURL = cfg.RunnerURL
	}
	if cfg.SliceSize > 0 {
		opts.SliceSize = cfg.SliceSize
	}
	if cfg.SliceStrategy != "" {
		opts.SliceStrategy = cfg.SliceStrategy
	}
	if cfg.RoundTimeoutSeconds > 0 {
		opts.RoundTimeoutSeconds = cfg.RoundTimeoutSeconds
	}
	if cfg.AvgSubmitSeconds > 0 {
		opts.AvgSubmitSeconds = cfg.AvgSubmitSeconds
	}
	if cfg.Randomness > 0 {
		opts.RandomnessPercent = cfg.Randomness
	}
	if cfg.JoinRampSeconds > 0 {
		opts.JoinRampSeconds = cfg.JoinRampSeconds
	}
	if len(cfg.Langs) > 0 {
		opts.LangMix = append([]string(nil), cfg.Langs...)
	}
	if cfg.Solutions.PythonDir != "" {
		opts.PythonSolutionsDir = resolvePath(cfg.sourceDir, cfg.Solutions.PythonDir)
	}
	if cfg.Solutions.CPPDir != "" {
		opts.CPPSolutionsDir = resolvePath(cfg.sourceDir, cfg.Solutions.CPPDir)
	}
	if cfg.TournamentType != "" {
		opts.TournamentType = cfg.TournamentType
	}
	if cfg.RoundsCount > 0 {
		opts.RoundsCount = cfg.RoundsCount
	}
	if cfg.MaxScore > 0 {
		opts.MaxScore = cfg.MaxScore
	}
	if cfg.ScoringStrategy != "" {
		opts.ScoringStrategy = cfg.ScoringStrategy
	}
	if cfg.MovementStrategy != "" {
		opts.MovementStrategy = cfg.MovementStrategy
	}
	if cfg.PlaceWeight > 0 {
		opts.PlaceWeight = cfg.PlaceWeight
	}
	if cfg.IncludeBots != nil {
		opts.IncludeBots = *cfg.IncludeBots
		opts.IncludeBotsSet = true
	}
	return opts
}
