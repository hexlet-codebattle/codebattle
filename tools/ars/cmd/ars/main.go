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
	})

	console := ui.NewConsole(master)
	if err := console.Run(ctx); err != nil && ctx.Err() == nil {
		log.Fatal(err)
	}
	stop()
	master.Wait()
}
