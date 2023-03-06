import Config

port = System.get_env("CODEBATTLE_PORT", "4000")
host = System.get_env("CODEBATTLE_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.get_env("CODEBATTLE_SECRET_KEY_BASE")
live_view_salt = System.get_env("CODEBATTLE_LIVE_VIEW_SALT")

config :codebattle, CodebattleWeb.Endpoint,
  http: [:inet6, port: port],
  url: [host: host, scheme: "https", port: 443],
  cache_static_manifest: "priv/static/cache_manifest.json",
  secret_key_base: secret_key_base,
  live_view: [signing_salt: live_view_salt],
  server: true

config :codebattle, host: host

config :codebattle, Codebattle.Repo,
  adapter: Ecto.Adapters.Postgres,
  ssl: true,
  port: System.get_env("CODEBATTLE_DB_PORT", "5432"),
  username: System.get_env("CODEBATTLE_DB_USERNAME"),
  password: System.get_env("CODEBATTLE_DB_PASSWORD"),
  hostname: System.get_env("CODEBATTLE_DB_HOSTNAME"),
  database: System.get_env("CODEBATTLE_DB_NAME"),
  pool_size: 25,
  log_level: :error

config :codebattle, :oauth,
  mock_clinet: false,
  github_client_id: System.get_env("GITHUB_CLIENT_ID", "ASFD"),
  github_client_secret: System.get_env("GITHUB_CLIENT_SECRET", "ASFD"),
  discord_client_id: System.get_env("DISCORD_CLIENT_ID", "ASFD"),
  discord_client_secret: System.get_env("DISCORD_CLIENT_SECRET", "ASFD")

config :codebattle, Codebattle.Plugs, rollbar_api_key: System.get_env("ROLLBAR_API_KEY")

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY"),
  firebase_autn_url: "https://identitytoolkit.googleapis.com/v1/accounts"

config :sentry,
  dsn: System.get_env("SENTRY_DNS_URL"),
  environment_name: :prod,
  enable_source_code_context: true,
  root_source_code_path: File.cwd!(),
  tags: %{env: "prod"},
  included_environments: [:prod]

port = System.get_env("CODEBATTLE_RUNNER_PORT", "4001")
host = System.get_env("CODEBATTLE_RUNNER_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.get_env("CODEBATTLE_SECRET_KEY_BASE")

config :runner, RunnerWeb.Endpoint,
  http: [:inet6, port: port],
  url: [host: host, port: 81],
  secret_key_base: secret_key_base,
  server: true

config :codebattle, :executor,
  runner_url: "http://runner.default.svc",
  api_key: System.get_env("CODEBATTLE_EXECUTOR_API_KEY", "x-key")
