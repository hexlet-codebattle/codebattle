use Mix.Config

config :codebattle, CodebattleWeb.Endpoint,
  http: [port: System.get_env("CODEBATTLE_PORT", "4000")],
  url: [scheme: "http", host: "codebattle.hexlet.io", port: 80],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true,
  root: ".",
  version: Mix.Project.config()[:version],
  check_origin: false

config :logger, level: :error

config :codebattle, Codebattle.Bot, timeout: 1000
config :codebattle, ws_port: 8080
