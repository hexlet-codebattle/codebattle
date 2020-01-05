use Mix.Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :codebattle, CodebattleWeb.Endpoint,
  http: [port: 4001],
  server: true

config :phoenix_integration, endpoint: CodebattleWeb.Endpoint

# Print only warnings and errors during test
config :logger, level: :error

# Configure your database
config :codebattle, Codebattle.Repo,
  username: System.get_env("CODEBATTLE_DB_USERNAME", "postgres"),
  password: System.get_env("CODEBATTLE_DB_PASSWORD", "postgres"),
  database: "codebattle_test",
  hostname: System.get_env("CODEBATTLE_DB_HOSTNAME", "localhost"),
  pool: Ecto.Adapters.SQL.Sandbox,
  ownership_timeout: 99_999_999

config :codebattle, Codebattle.Bot, timeout: 60_000
config :codebattle, Codebattle.Bot.PlaybookPlayerRunner, timeout: 300

adapter =
  case System.get_env("CODEBATTLE_RUN_CODE_CHECK") do
    "true" -> Codebattle.CodeCheck.Checker
    _ -> Codebattle.CodeCheck.FakeChecker
  end

config :codebattle, code_check_timeout: 15_000
config :codebattle, checker_adapter: adapter
config :codebattle, tournament_match_timeout: 1

config :codebattle, ws_port: 4001
