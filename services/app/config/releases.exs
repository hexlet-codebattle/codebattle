import Config

port = System.get_env("CODEBATTLE_PORT", "4000")
host = System.get_env("CODEBATTLE_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.fetch_env!("CODEBATTLE_SECRET_KEY_BASE")
live_view_salt = System.fetch_env!("CODEBATTLE_LIVE_VIEW_SALT")

config :codebattle, CodebattleWeb.Endpoint,
  http: [:inet6, port: port],
  url: [host: host, port: 80],
  cache_static_manifest: "priv/static/cache_manifest.json",
  secret_key_base: secret_key_base,
  live_view: [signing_salt: live_view_salt],
  server: true

config :codebattle, host: host

config :codebattle, Codebattle.Repo,
  adapter: Ecto.Adapters.Postgres,
  database: System.get_env("CODEBATTLE_DB_NAME"),
  ssl: true,
  port: System.fetch_env!("CODEBATTLE_DB_PORT"),
  username: System.fetch_env!("CODEBATTLE_DB_USERNAME"),
  password: System.fetch_env!("CODEBATTLE_DB_PASSWORD"),
  database: System.fetch_env!("CODEBATTLE_DB_NAME"),
  hostname: System.fetch_env!("CODEBATTLE_DB_HOSTNAME"),
  pool_size: 7

config :ueberauth, Ueberauth.Strategy.Github.OAuth,
  client_id: System.fetch_env!("GITHUB_CLIENT_ID"),
  client_secret: System.fetch_env!("GITHUB_CLIENT_SECRET")

config :one_signal, OneSignal,
  app_id: System.fetch_env!("ONESIGNAL_APP_ID"),
  api_key: System.fetch_env!("ONESIGNAL_API_KEY")
