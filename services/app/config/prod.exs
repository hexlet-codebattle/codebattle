import Config

config :codebattle, CodebattleWeb.Endpoint,
  http: [port: System.get_env("CODEBATTLE_PORT", "4000")],
  url: [scheme: "http", host: "codebattle.hexlet.io", port: 80],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true,
  root: ".",
  version: Mix.Project.config()[:version],
  check_origin: false

config :logger, level: :error, backends: [:console, Sentry.LoggerBackend]

config :codebattle, Codebattle.Invite, timeout: :timer.minutes(15)
config :codebattle, Codebattle.Invite, lifetime: :timer.minutes(15)
config :codebattle, ws_port: 8080

config :codebattle,
  admins: [
    "vtm",
    "ReDBrother",
    "solar05",
    "mokevnin",
    "Melodyn",
    "NatMusina"
  ]

config :codebattle, restore_tournaments: true
config :codebattle, load_dot_env_file: false
config :codebattle, use_prod_workers: true
config :codebattle, html_env: :prod
config :codebattle, html_include_prod_scripts: true
config :codebattle, html_debug_mode: false

executor =
  case System.get_env("CODEBATTLE_EXECUTOR") do
    "local" -> Codebattle.CodeCheck.Executor.Local
    _ -> Codebattle.CodeCheck.Executor.Remote
  end

config :codebattle, checker_executor: executor

config :codebattle, :executor,
  runner_url: "http://runner.default.svc",
  api_key: "x-key"

config :runner, load_dot_env_file: false
config :runner, use_prod_workers: true

config :runner, RunnerWeb.Endpoint,
  http: [port: System.get_env("4001")],
  url: [scheme: "http", host: "codebattle.hexlet.io", port: 80],
  server: true,
  root: ".",
  version: Mix.Project.config()[:version],
  check_origin: false
