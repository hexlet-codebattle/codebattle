package config

import (
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/hexlet-codebattle/ars/internal/runtime"
)

func LoadDefaults() runtime.Options {
	envPath := findEnvPath()
	envValues := parseDotEnv(envPath)

	serverURL := firstNonEmpty(
		envValues["ARS_SERVER_URL"],
		buildLocalServerURL(envValues["CODEBATTLE_PORT"]),
		"http://localhost:4000",
	)

	users := parseInt(firstNonEmpty(envValues["ARS_USERS"], "2"), 2)
	rounds := parseInt(firstNonEmpty(envValues["ARS_ROUNDS"], "3"), 3)
	breakDuration := parseInt(firstNonEmpty(envValues["ARS_BREAK_SECONDS"], "5"), 5)
	avgTaskSeconds := parseInt(firstNonEmpty(envValues["ARS_AVG_TASK_SECONDS"], "10"), 10)
	randomness := parseInt(firstNonEmpty(envValues["ARS_RANDOMNESS"], "25"), 25)
	joinRampSeconds := parseInt(firstNonEmpty(envValues["ARS_JOIN_RAMP_SECONDS"], "5"), 5)
	langs := runtime.ParseLangMix(firstNonEmpty(envValues["ARS_LANGS"], "python,cpp"))

	return runtime.Options{
		ServerURL:            serverURL,
		AuthKey:              firstNonEmpty(envValues["ARS_AUTH_KEY"], envValues["CODEBATTLE_API_AUTH_KEY"]),
		UsersCount:           users,
		RoundsLimit:          rounds,
		BreakDurationSeconds: breakDuration,
		AvgTaskSeconds:       avgTaskSeconds,
		RandomnessPercent:    randomness,
		JoinRampSeconds:      joinRampSeconds,
		LangMix:              langs,
	}
}

func findEnvPath() string {
	candidates := []string{
		".env",
		filepath.Join("..", "..", ".env"),
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	return ""
}

func parseDotEnv(path string) map[string]string {
	values := map[string]string{}
	if path == "" {
		return values
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return values
	}

	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		values[strings.TrimSpace(key)] = strings.TrimSpace(value)
	}

	return values
}

func buildLocalServerURL(port string) string {
	if strings.TrimSpace(port) == "" {
		return ""
	}

	host := url.URL{
		Scheme: "http",
		Host:   "localhost:" + strings.TrimSpace(port),
	}

	return host.String()
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}

	return ""
}

func parseInt(value string, fallback int) int {
	result, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || result <= 0 {
		return fallback
	}

	return result
}
