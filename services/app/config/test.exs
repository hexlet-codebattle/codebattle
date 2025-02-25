import Config

checker_executor =
  case System.get_env("CODEBATTLE_EXECUTOR") do
    "local" -> Codebattle.CodeCheck.Executor.Local
    "remote" -> Codebattle.CodeCheck.Executor.RemoteDockerRun
    "rust" -> Codebattle.CodeCheck.Executor.RemoteRust
    _ -> Codebattle.CodeCheck.Executor.Fake
  end

asserts_executor =
  case System.get_env("CODEBATTLE_EXECUTOR") do
    "local" -> Codebattle.AssertsService.Executor.Local
    "remote" -> Codebattle.AssertsService.Executor.Remote
    _ -> Codebattle.AssertsService.Executor.Fake
  end

config :codebattle, ChromicPDF, on_demand: true

config :codebattle, Codebattle.Bot,
  timeout: 60_000,
  min_bot_step_timeout: 0

config :codebattle, Codebattle.Invite,
  timeout: to_timeout(second: 1000),
  # Configure your database
  lifetime: to_timeout(second: 0)

config :codebattle, Codebattle.Repo,
  username: System.get_env("CODEBATTLE_DB_USERNAME", "postgres"),
  password: System.get_env("CODEBATTLE_DB_PASSWORD", "postgres"),
  database: "codebattle_test",
  hostname: System.get_env("CODEBATTLE_DB_HOSTNAME", "localhost"),
  pool: Ecto.Adapters.SQL.Sandbox,
  log: false,
  pool_size: 50,
  ownership_timeout: 99_999_999

config :codebattle, CodebattleWeb.BotEndpoint,
  http: [port: 4002],
  # We don't run a server during test. If one is required,
  # you can enable the server option below.
  server: true

config :codebattle, CodebattleWeb.Endpoint,
  http: [port: 4001],
  server: true

config :codebattle, :firebase,
  sender_id: "ASDF",
  api_key: "ASDF",
  firebase_autn_url: "http://localhost:4000"

config :codebattle, :oauth,
  github_client_id: "GITHUB_CLIENT_ID",
  github_client_secret: "GITHUB_CLIENT_SECRET",
  discord_client_id: "DISCORD_CLIENT_ID",
  discord_client_secret: "DISCORD_CLIENT_SECRET"

config :codebattle, :start_create_bot_timeout, to_timeout(hour: 1)
config :codebattle, app_version: "fc426ea537962d8e5af5e31e515f7000deeedc68"
config :codebattle, asserts_executor: asserts_executor

config :codebattle,
  auth_req_options: [
    plug: {Req.Test, Codebattle.Auth}
  ]

config :codebattle, checker_executor: checker_executor
config :codebattle, code_check_timeout: 35_000
config :codebattle, create_bot_games: false
# Print only warnings and errors during test
# if is_nil(System.get_env("DEBUG")) do
#   config :logger, level: :critical
# else
config :codebattle, fake_html_to_image: true
config :codebattle, freeze_time: true
config :codebattle, max_alive_tournaments: 700
config :codebattle, tasks_provider: Codebattle.Game.FakeTasksQueuesServer
config :codebattle, tournament_match_timeout: 1
config :codebattle, tournament_rematch_timeout_ms: 1
config :codebattle, user_rank_server: false
config :codebattle, ws_port: 4001

config :fun_with_flags, :cache, enabled: false
config :fun_with_flags, :cache_bust_notifications, enabled: false

config :logger, :console, level: :error

config :phoenix_integration, endpoint: CodebattleWeb.Endpoint

config :runner, fake_docker_run: true
