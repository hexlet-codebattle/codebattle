package config

import (
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/hexlet-codebattle/dima/internal/runtime"
)

func LoadDefaults() runtime.Options {
	envPath := findEnvPath()
	envValues := parseDotEnv(envPath)

	serverURL := firstNonEmpty(
		envValues["DIMA_SERVER_URL"],
		buildLocalServerURL(envValues["CODEBATTLE_PORT"]),
		"http://localhost:4000",
	)

	users := parseInt(firstNonEmpty(envValues["DIMA_USERS"], "10"), 10)
	groupTaskID := parseIntOrZero(envValues["DIMA_GROUP_TASK_ID"])
	sliceSize := parseInt(firstNonEmpty(envValues["DIMA_SLICE_SIZE"], "16"), 16)
	avgSubmit := parseInt(firstNonEmpty(envValues["DIMA_AVG_SUBMIT_SECONDS"], "20"), 20)
	randomness := parseInt(firstNonEmpty(envValues["DIMA_RANDOMNESS"], "30"), 30)
	joinRamp := parseInt(firstNonEmpty(envValues["DIMA_JOIN_RAMP_SECONDS"], "5"), 5)
	langs := runtime.ParseLangMix(firstNonEmpty(envValues["DIMA_LANGS"], "python,cpp"))
	sliceStrategy := firstNonEmpty(envValues["DIMA_SLICE_STRATEGY"], "random")

	return runtime.Options{
		ServerURL:          serverURL,
		AuthKey:            firstNonEmpty(envValues["DIMA_AUTH_KEY"], envValues["CODEBATTLE_API_AUTH_KEY"]),
		UsersCount:         users,
		GroupTaskID:        groupTaskID,
		RunnerURL:          envValues["DIMA_RUNNER_URL"],
		SliceSize:          sliceSize,
		SliceStrategy:      sliceStrategy,
		AvgSubmitSeconds:   avgSubmit,
		RandomnessPercent:  randomness,
		JoinRampSeconds:    joinRamp,
		LangMix:            langs,
		PythonSolutionsDir: envValues["DIMA_PYTHON_SOLUTIONS_DIR"],
		CPPSolutionsDir:    envValues["DIMA_CPP_SOLUTIONS_DIR"],
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

func parseIntOrZero(value string) int {
	result, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || result < 0 {
		return 0
	}
	return result
}
