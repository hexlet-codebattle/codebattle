import Config

port = System.get_env("CODEBATTLE_PORT", "4000")
host = System.get_env("CODEBATTLE_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.get_env("CODEBATTLE_SECRET_KEY_BASE")
live_view_salt = System.get_env("CODEBATTLE_LIVE_VIEW_SALT")

config :codebattle, CodebattleWeb.Endpoint,
  http: [port: port],
  url: [host: host, scheme: "https", port: 443],
  cache_static_manifest: "priv/static/cache_manifest.json",
  secret_key_base: secret_key_base,
  live_view: [signing_salt: live_view_salt],
  server: true

config :codebattle, CodebattleWeb.BotEndpoint,
  http: [:inet6, port: "4002"],
  url: [host: host, scheme: "https", port: 443],
  secret_key_base: secret_key_base,
  server: true

config :codebattle, host: host

config :codebattle, Codebattle.Repo,
  adapter: Ecto.Adapters.Postgres,
  ssl: true,
  ssl_opts: [
    verify: :verify_none
  ],
  port: System.get_env("CODEBATTLE_DB_PORT", "5432"),
  username: System.get_env("CODEBATTLE_DB_USERNAME"),
  password: System.get_env("CODEBATTLE_DB_PASSWORD"),
  hostname: System.get_env("CODEBATTLE_DB_HOSTNAME"),
  database: System.get_env("CODEBATTLE_DB_NAME"),
  pool_size: "CODEBATTLE_POOL_SIZE" |> System.get_env("10") |> String.to_integer(),
  log_level: :error

config :codebattle, :oauth,
  github_client_id: System.get_env("GITHUB_CLIENT_ID", "ASFD"),
  github_client_secret: System.get_env("GITHUB_CLIENT_SECRET", "ASFD"),
  discord_client_id: System.get_env("DISCORD_CLIENT_ID", "ASFD"),
  discord_client_secret: System.get_env("DISCORD_CLIENT_SECRET", "ASFD")

import_github_tasks = System.get_env("CODEBATTLE_IMPORT_GITHUB_TASKS") == "true"
create_bot_games = System.get_env("CODEBATTLE_CREATE_BOT_GAMES") == "true"
use_external_js = System.get_env("CODEBATTLE_USE_EXTERNAL_JS") == "true"
hide_header = System.get_env("CODEBATTLE_HIDE_HEADER") == "true"
use_only_token_auth = System.get_env("CODEBATTLE_USE_ONLY_TOKEN_AUTH") == "true"
show_extension_popup = System.get_env("CODEBATTLE_SHOW_EXTENSION_POPUP") == "true"
allow_guests = System.get_env("CODEBATTLE_ALLOW_GUESTS") == "true"
use_presence = System.get_env("CODEBATTLE_USE_PRESENCE") == "true"
record_games = System.get_env("CODEBATTLE_RECORD_GAMES") == "true"

tournament_rematch_timeout_ms =
  "CODEBATTLE_TOURNAMENT_REMATCH_TIMEOUT_MS" |> System.get_env("5000") |> String.to_integer()

config :codebattle, import_github_tasks: import_github_tasks
config :codebattle, create_bot_games: create_bot_games
config :codebattle, use_external_js: use_external_js
config :codebattle, hide_header: hide_header
config :codebattle, use_only_token_auth: use_only_token_auth
config :codebattle, show_extension_popup: show_extension_popup
config :codebattle, tournament_rematch_timeout_ms: tournament_rematch_timeout_ms
config :codebattle, allow_guests: allow_guests
config :codebattle, use_presence: use_presence
config :codebattle, record_games: record_games
config :codebattle, collab_logo: System.get_env("CODEBATTLE_COLLAB_LOGO")
config :codebattle, force_redirect_url: System.get_env("CODEBATTLE_FORCE_REDIRECT_URL", "")

config :codebattle, Codebattle.Plugs, rollbar_api_key: System.get_env("ROLLBAR_API_KEY")

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY"),
  firebase_autn_url: "https://identitytoolkit.googleapis.com/v1/accounts"

checker_executor =
  case System.get_env("CODEBATTLE_EXECUTOR") do
    "rust" -> Codebattle.CodeCheck.Executor.RemoteRust
    _ -> Codebattle.CodeCheck.Executor.RemoteDockerRun
  end

config :codebattle, checker_executor: checker_executor
config :codebattle, asserts_executor: Codebattle.AssertsService.Executor.Remote
config :codebattle, :api_key, System.get_env("CODEBATTLE_EXECUTOR_API_KEY")

config :sentry,
  dsn: System.get_env("SENTRY_DNS_URL"),
  environment_name: :prod,
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()]

port = System.get_env("CODEBATTLE_RUNNER_PORT", "4001")
host = System.get_env("CODEBATTLE_RUNNER_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.get_env("CODEBATTLE_SECRET_KEY_BASE")

config :codebattle,
  deployed_at: System.get_env("DEPLOYED_AT") || Calendar.strftime(DateTime.utc_now(), "%c")

config :runner, RunnerWeb.Endpoint,
  http: [:inet6, port: port],
  url: [host: host, port: 81],
  secret_key_base: secret_key_base,
  server: true

config :runner,
  max_parallel_containers_run:
    System.get_env("CODEBATTLE_MAX_PARALLEL_CONTAINERS_RUN", "16") |> String.to_integer()

config :runner, :runner_url, "http://runner.default.svc"
config :runner, :runner_rust_url, "http://runner-rs.default.svc"
config :runner, pull_docker_images: System.get_env("RUNNER_PULL_DOCKER_IMAGES", "") == "true"
config :runner, cpu_logger: System.get_env("RUNNER_CPU_LOGGER", "") == "true"
config :runner, container_killer: System.get_env("RUNNER_CONTAINER_KILLER", "") == "true"
