package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/hexlet-codebattle/dima/internal/config"
	"github.com/hexlet-codebattle/dima/internal/extapi"
	"github.com/hexlet-codebattle/dima/internal/runtime"
	"github.com/hexlet-codebattle/dima/internal/ui"
)

func main() {
	defaults := config.LoadDefaults()

	configPath := flag.String("config", "", "path to dima.toml config (overrides .env, overridden by CLI flags)")
	serverURL := flag.String("server", "", "Codebattle base URL")
	authKey := flag.String("auth-key", "", "ext_api auth key")
	users := flag.Int("users", 0, "number of synthetic users")
	groupTaskID := flag.Int("group-task-id", 0, "group task id (0 = pick first available)")
	runnerURL := flag.String("runner-url", "", "override the group_task runner_url (writes to the row before running)")
	sliceSize := flag.Int("slice-size", 0, "slice size for the group tournament")
	sliceStrategy := flag.String("slice-strategy", "", "slice strategy: random|rating")
	avgSubmit := flag.Int("avg-submit-seconds", 0, "avg seconds between solution submissions per user")
	randomness := flag.Int("randomness", -1, "submit jitter percent")
	joinRampSeconds := flag.Int("join-ramp-seconds", -1, "seconds to ramp users into the channel")
	langs := flag.String("langs", "", "comma-separated language rotation")
	pythonDir := flag.String("python-solutions-dir", "", "directory of python solution files (one per file)")
	cppDir := flag.String("cpp-solutions-dir", "", "directory of cpp solution files (one per file)")
	flag.Parse()

	opts := defaults
	resolvedConfig := *configPath
	if resolvedConfig == "" {
		resolvedConfig = config.FindConfigPath()
	}
	if resolvedConfig != "" {
		fileCfg, err := config.LoadFile(resolvedConfig)
		if err != nil {
			log.Fatalf("config: %v", err)
		}
		opts = config.ApplyFile(opts, fileCfg)
		log.Printf("dima: loaded config %s", resolvedConfig)
	}

	if *serverURL != "" {
		opts.ServerURL = *serverURL
	}
	if *authKey != "" {
		opts.AuthKey = *authKey
	}
	if *users > 0 {
		opts.UsersCount = *users
	}
	if *groupTaskID > 0 {
		opts.GroupTaskID = *groupTaskID
	}
	if *runnerURL != "" {
		opts.RunnerURL = *runnerURL
	}
	if *sliceSize > 0 {
		opts.SliceSize = *sliceSize
	}
	if *sliceStrategy != "" {
		opts.SliceStrategy = *sliceStrategy
	}
	if *avgSubmit > 0 {
		opts.AvgSubmitSeconds = *avgSubmit
	}
	if *randomness >= 0 {
		opts.RandomnessPercent = *randomness
	}
	if *joinRampSeconds >= 0 {
		opts.JoinRampSeconds = *joinRampSeconds
	}
	if strings.TrimSpace(*langs) != "" {
		opts.LangMix = runtime.ParseLangMix(*langs)
	}
	if *pythonDir != "" {
		opts.PythonSolutionsDir = *pythonDir
	}
	if *cppDir != "" {
		opts.CPPSolutionsDir = *cppDir
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	client := extapi.NewClient(opts.ServerURL, opts.AuthKey)
	master := runtime.NewMaster(client, opts)

	console := ui.NewConsole(master)
	if err := console.Run(ctx); err != nil && ctx.Err() == nil {
		log.Fatal(err)
	}
	stop()
	master.Wait()
}
