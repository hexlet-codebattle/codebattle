import Config

config :codebattle, CodebattleWeb.Endpoint,
  http: [
    port: System.get_env("CODEBATTLE_PORT", "4000"),
    transport_options: [
      max_connections: 30000,
      num_acceptors: 5000
    ]
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

config :logger, level: :error

config :codebattle, Codebattle.Invite, timeout: :timer.minutes(15)
config :codebattle, Codebattle.Invite, lifetime: :timer.minutes(15)
config :codebattle, ws_port: 8080

config :codebattle, restore_tournaments: true
config :codebattle, load_dot_env_file: false
config :codebattle, import_github_tasks: true
config :codebattle, html_env: :prod
config :codebattle, use_external_js: true
config :codebattle, html_debug_mode: false
config :codebattle, app_version: System.get_env("APP_VERSION", "")

config :runner, load_dot_env_file: false

config :runner, RunnerWeb.Endpoint,
  http: [port: System.get_env("4001")],
  url: [scheme: "http", host: "codebattle.hexlet.io", port: 80],
  server: true,
  root: ".",
  version: Mix.Project.config()[:version],
  check_origin: false
