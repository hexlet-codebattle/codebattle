import Config

config :codebattle, Codebattle.Invite, lifetime: to_timeout(minute: 15)
config :codebattle, Codebattle.Invite, timeout: to_timeout(minute: 15)

config :codebattle, CodebattleWeb.Endpoint,
  http: [
    port: System.get_env("CODEBATTLE_PORT", "4000")
  ],
  url: [
    scheme: "https",
    host: System.get_env("CODEBATTLE_HOST", "codebattle.hexlet.io"),
    port: 443
  ],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true,
  root: ".",
  version: Mix.Project.config()[:version],
  check_origin: false

config :codebattle, :tournament_run_upcoming, true
config :codebattle, dev_sign_in: false
config :codebattle, env: :prod
config :codebattle, html_debug_mode: false
config :codebattle, load_dot_env_file: false
config :codebattle, ws_port: 4000

config :logger, level: :error

config :runner, RunnerWeb.Endpoint,
  http: [port: System.get_env("4001")],
  url: [scheme: "http", host: "codebattle.hexlet.io", port: 80],
  server: true,
  root: ".",
  version: Mix.Project.config()[:version],
  check_origin: false

config :runner, load_dot_env_file: false
