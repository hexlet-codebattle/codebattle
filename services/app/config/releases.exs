import Config

port = System.get_env("CODEBATTLE_PORT", "4000")
host = System.get_env("CODEBATTLE_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.get_env("CODEBATTLE_SECRET_KEY_BASE")
live_view_salt = System.get_env("CODEBATTLE_LIVE_VIEW_SALT")

import_github_tasks = System.get_env("CODEBATTLE_IMPORT_GITHUB_TASKS") == "true"
create_bot_games = System.get_env("CODEBATTLE_CREATE_BOT_GAMES") == "true"
use_external_js = System.get_env("CODEBATTLE_USE_EXTERNAL_JS") == "true"
hide_header = System.get_env("CODEBATTLE_HIDE_HEADER") == "true"
hide_footer = System.get_env("CODEBATTLE_HIDE_FOOTER") == "true"
hide_user_dropdown = System.get_env("CODEBATTLE_HIDE_USER_DROPDOWN") == "true"
hide_invites = System.get_env("CODEBATTLE_HIDE_INVITES") == "true"
use_only_token_auth = System.get_env("CODEBATTLE_USE_ONLY_TOKEN_AUTH") == "true"
show_extension_popup = System.get_env("CODEBATTLE_SHOW_EXTENSION_POPUP") == "true"
allow_guests = System.get_env("CODEBATTLE_ALLOW_GUESTS") == "true"
use_presence = System.get_env("CODEBATTLE_USE_PRESENCE") == "true"
record_games = System.get_env("CODEBATTLE_RECORD_GAMES") == "true"
use_event_rating = System.get_env("CODEBATTLE_USE_EVENT_RATING") == "true"
use_event_rank = System.get_env("CODEBATTLE_USE_EVENT_RANK") == "true"

tournament_rematch_timeout_ms =
  "CODEBATTLE_TOURNAMENT_REMATCH_TIMEOUT_MS" |> System.get_env("5000") |> String.to_integer()

checker_executor =
  case System.get_env("CODEBATTLE_EXECUTOR") do
    "rust" -> Codebattle.CodeCheck.Executor.RemoteRust
    _ -> Codebattle.CodeCheck.Executor.RemoteDockerRun
  end

port = System.get_env("CODEBATTLE_RUNNER_PORT", "4001")
host = System.get_env("CODEBATTLE_RUNNER_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.get_env("CODEBATTLE_SECRET_KEY_BASE")

config :codebattle, Codebattle.Plugs, rollbar_api_key: System.get_env("ROLLBAR_API_KEY")

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

config :codebattle, CodebattleWeb.BotEndpoint,
  http: [:inet6, port: "4002"],
  url: [host: host, scheme: "https", port: 443],
  secret_key_base: secret_key_base,
  server: true

config :codebattle, CodebattleWeb.Endpoint,
  http: [port: port],
  url: [host: host, scheme: "https", port: 443],
  cache_static_manifest: "priv/static/cache_manifest.json",
  secret_key_base: secret_key_base,
  live_view: [signing_salt: live_view_salt],
  server: true

config :codebattle, :api_key, System.get_env("CODEBATTLE_API_AUTH_KEY")

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY"),
  firebase_autn_url: "https://identitytoolkit.googleapis.com/v1/accounts"

config :codebattle, :lobby_event_slug, System.get_env("CODEBATTLE_LOBBY_EVENT_SLUG")

config :codebattle, :oauth,
  github_client_id: System.get_env("GITHUB_CLIENT_ID", "ASFD"),
  github_client_secret: System.get_env("GITHUB_CLIENT_SECRET", "ASFD"),
  discord_client_id: System.get_env("DISCORD_CLIENT_ID", "ASFD"),
  discord_client_secret: System.get_env("DISCORD_CLIENT_SECRET", "ASFD")

config :codebattle, allow_guests: allow_guests
config :codebattle, asserts_executor: Codebattle.AssertsService.Executor.Remote
config :codebattle, checker_executor: checker_executor
config :codebattle, collab_logo: System.get_env("CODEBATTLE_COLLAB_LOGO")
config :codebattle, collab_logo_minor: System.get_env("CODEBATTLE_COLLAB_LOGO_MINOR")
config :codebattle, create_bot_games: create_bot_games
config :codebattle, default_locale: System.get_env("CODEBATTLE_DEFAULT_LOCALE", "en")

config :codebattle,
  deployed_at: System.get_env("DEPLOYED_AT") || Calendar.strftime(DateTime.utc_now(), "%c")

config :codebattle, force_locale: System.get_env("CODEBATTLE_FORCE_LOCALE", "false") == "true"
config :codebattle, force_redirect_url: System.get_env("CODEBATTLE_FORCE_REDIRECT_URL")

config :codebattle,
  guest_user_force_redirect_url: System.get_env("CODEBATTLE_GUEST_USER_FORCE_REDIRECT_URL")

config :codebattle, hide_footer: hide_footer
config :codebattle, hide_header: hide_header
config :codebattle, hide_invites: hide_invites
config :codebattle, hide_user_dropdown: hide_user_dropdown
config :codebattle, host: host
config :codebattle, import_github_tasks: import_github_tasks

config :codebattle,
  jitsi_api_key: System.get_env("JITSI_API_KEY", "")

config :codebattle, record_games: record_games
config :codebattle, show_extension_popup: show_extension_popup
config :codebattle, tournament_rematch_timeout_ms: tournament_rematch_timeout_ms
config :codebattle, use_event_rank: use_event_rank
config :codebattle, use_event_rating: use_event_rating
config :codebattle, use_external_js: use_external_js
config :codebattle, use_only_token_auth: use_only_token_auth
config :codebattle, use_presence: use_presence

config :phoenix_meta_tags,
  title: System.get_env("CODEBATTLE_META_TITLE", "Hexlet Codebattle • Game for programmers"),
  description:
    System.get_env(
      "CODEBATTLE_META_DESCRIPTION",
      "Free online game for programmers. No ads, registration from github. Solve Tasks with the bot, friends or random players."
    ),
  url:
    System.get_env(
      "CODEBATTLE_META_URL",
      "https://codebattle.hexlet.io"
    ),
  image:
    System.get_env(
      "CODEBATTLE_META_IMAGE",
      "https://codebattle.hexlet.io/assets/images/opengraph-main.png"
    ),
  "og:type": "website",
  fb: %{
    size: %{
      width: 100,
      height: 200,
      position: %{
        x: 10,
        y: 15
      }
    }
  },
  twitter: %{
    card: "summary_large_image"
  }

config :runner, RunnerWeb.Endpoint,
  http: [:inet6, port: port],
  url: [host: host, port: 81],
  secret_key_base: secret_key_base,
  server: true

config :runner, :runner_url, "http://runner.default.svc"
config :runner, container_killer: System.get_env("RUNNER_CONTAINER_KILLER", "") == "true"
config :runner, cpu_logger: System.get_env("RUNNER_CPU_LOGGER", "") == "true"

config :runner,
  max_parallel_containers_run: "CODEBATTLE_MAX_PARALLEL_CONTAINERS_RUN" |> System.get_env("16") |> String.to_integer()

config :runner, pull_docker_images: System.get_env("RUNNER_PULL_DOCKER_IMAGES", "") == "true"

config :sentry,
  dsn: System.get_env("SENTRY_DNS_URL"),
  environment_name: :prod,
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()]

config :sentry_fe, dsn: System.get_env("SENTRY_FE_DNS_URL") || System.get_env("SENTRY_DNS_URL")
