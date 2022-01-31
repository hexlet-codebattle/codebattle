import Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :codebattle, CodebattleWeb.Endpoint,
  http: [port: 4001],
  server: true

config :phoenix_integration, endpoint: CodebattleWeb.Endpoint

# Print only warnings and errors during test
if is_nil(System.get_env("DEBUG")) do
  config :logger, level: :error
else
  config :logger, :console, level: :debug
end

# Configure your database
config :codebattle, Codebattle.Repo,
  username: System.get_env("CODEBATTLE_DB_USERNAME", "postgres"),
  password: System.get_env("CODEBATTLE_DB_PASSWORD", "postgres"),
  database: "codebattle_test",
  hostname: System.get_env("CODEBATTLE_DB_HOSTNAME", "localhost"),
  pool: Ecto.Adapters.SQL.Sandbox,
  ownership_timeout: 99_999_999

config :codebattle, Codebattle.Bot,
  timeout: 60_000,
  timeout_start_playbook: 0,
  min_bot_player_speed: 0

adapter =
  case System.get_env("CODEBATTLE_RUN_CODE_CHECK") do
    "true" -> Codebattle.CodeCheck.DockerChecker
    _ -> Codebattle.CodeCheck.FakeChecker
  end

config :codebattle, code_check_timeout: 35_000
config :codebattle, checker_adapter: adapter
config :codebattle, tournament_match_timeout: 1
config :codebattle, Codebattle.Invite, timeout: :timer.seconds(1000)
config :codebattle, Codebattle.Invite, lifetime: :timer.seconds(0)
config :codebattle, tasks_provider: Codebattle.Game.FakeTasksQueuesServer

config :codebattle, :firebase,
  sender_id: "ASDF",
  api_key: "ASDF",
  firebase_autn_url: "http://localhost:4000"

config :codebattle, ws_port: 4001

config :codebattle, admins: ["admin"]
