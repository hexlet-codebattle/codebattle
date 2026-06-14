package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/hexlet-codebattle/ars/internal/config"
	"github.com/hexlet-codebattle/ars/internal/extapi"
	"github.com/hexlet-codebattle/ars/internal/runtime"
	"github.com/hexlet-codebattle/ars/internal/ui"
)

func main() {
	defaults := config.LoadDefaults()

	serverURL := flag.String("server", defaults.ServerURL, "Codebattle base URL")
	authKey := flag.String("auth-key", defaults.AuthKey, "ext_api auth key")
	users := flag.Int("users", defaults.UsersCount, "number of synthetic users")
	rounds := flag.Int("rounds", defaults.RoundsLimit, "number of tournament rounds")
	breakDuration := flag.Int("break-seconds", defaults.BreakDurationSeconds, "break duration between rounds")
	avgTaskSeconds := flag.Int("avg-task-seconds", defaults.AvgTaskSeconds, "average task solve time in seconds")
	randomness := flag.Int("randomness", defaults.RandomnessPercent, "typing randomness percent")
	joinRampSeconds := flag.Int("join-ramp-seconds", defaults.JoinRampSeconds, "seconds to ramp users into the tournament")
	langs := flag.String("langs", strings.Join(defaults.LangMix, ","), "comma-separated language rotation")

	tournamentType := flag.String("type", defaults.TournamentType, "tournament type (swiss|top200|show|...)")
	taskProvider := flag.String("task-provider", defaults.TaskProvider, "task provider (level|task_pack|all)")
	taskStrategy := flag.String("task-strategy", defaults.TaskStrategy, "task strategy (sequential|random|per_round_pair)")
	taskPackName := flag.String("task-pack-name", defaults.TaskPackName, "task pack name when task-provider=task_pack")
	level := flag.String("level", defaults.Level, "task level when task-provider=level (easy|medium|hard)")
	rankingType := flag.String("ranking-type", defaults.RankingType, "ranking type (by_user|by_clan|...)")
	scoreStrategy := flag.String("score-strategy", defaults.ScoreStrategy, "score strategy (win_loss|75_percentile)")
	timeoutMode := flag.String("timeout-mode", defaults.TimeoutMode, "timeout mode (per_task|per_round_fixed|per_round_with_rematch|per_tournament)")
	roundTimeoutSeconds := flag.Int("round-timeout-seconds", defaults.RoundTimeoutSeconds, "round timer length (used with per_round_* timeout modes)")
	playersLimit := flag.Int("players-limit", defaults.PlayersLimit, "tournament players_limit override")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	client := extapi.NewClient(*serverURL, *authKey)
	master := runtime.NewMaster(client, runtime.Options{
		ServerURL:            *serverURL,
		AuthKey:              *authKey,
		UsersCount:           *users,
		RoundsLimit:          *rounds,
		BreakDurationSeconds: *breakDuration,
		AvgTaskSeconds:       *avgTaskSeconds,
		RandomnessPercent:    *randomness,
		JoinRampSeconds:      *joinRampSeconds,
		LangMix:              runtime.ParseLangMix(*langs),
		TournamentType:       *tournamentType,
		TaskProvider:         *taskProvider,
		TaskStrategy:         *taskStrategy,
		TaskPackName:         *taskPackName,
		Level:                *level,
		RankingType:          *rankingType,
		ScoreStrategy:        *scoreStrategy,
		TimeoutMode:          *timeoutMode,
		RoundTimeoutSeconds:  *roundTimeoutSeconds,
		PlayersLimit:         *playersLimit,
	})

	console := ui.NewConsole(master)
	if err := console.Run(ctx); err != nil && ctx.Err() == nil {
		log.Fatal(err)
	}
	stop()
	master.Wait()
}
