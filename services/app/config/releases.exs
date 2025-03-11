import Config

codebattle_port = System.get_env("CODEBATTLE_PORT", "4000")
codebattle_host = System.get_env("CODEBATTLE_HOSTNAME", "codebattle.hexlet.io")
codebattle_url = "https://#{codebattle_host}"
secret_key_base = System.get_env("CODEBATTLE_SECRET_KEY_BASE")
live_view_salt = System.get_env("CODEBATTLE_LIVE_VIEW_SALT")
app_title = System.get_env("CODEBATTLE_APP_TITLE", "Hexlet Codebattle")
app_subtitle = System.get_env("CODEBATTLE_APP_SUBTITLE", "by Hexlet’s community")

tournament_rematch_timeout_ms =
  "CODEBATTLE_TOURNAMENT_REMATCH_TIMEOUT_MS" |> System.get_env("5000") |> String.to_integer()

checker_executor =
  case System.get_env("CODEBATTLE_EXECUTOR") do
    "rust" -> Codebattle.CodeCheck.Executor.RemoteRust
    _ -> Codebattle.CodeCheck.Executor.RemoteDockerRun
  end

runner_port = System.get_env("CODEBATTLE_RUNNER_PORT", "4001")
runner_host = System.get_env("CODEBATTLE_RUNNER_HOSTNAME", "codebattle.hexlet.io")
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
  url: [host: codebattle_host, scheme: "https", port: 443],
  secret_key_base: secret_key_base,
  server: true

config :codebattle, CodebattleWeb.Endpoint,
  http: [port: codebattle_port],
  url: [host: codebattle_host, scheme: "https", port: 443],
  cache_static_manifest: "priv/static/cache_manifest.json",
  secret_key_base: secret_key_base,
  live_view: [signing_salt: live_view_salt],
  server: true

config :codebattle, :api_key, System.get_env("CODEBATTLE_API_AUTH_KEY")
config :codebattle, :app_subtitle, app_subtitle
config :codebattle, :app_title, app_title
config :codebattle, :default_lang_slug, System.get_env("CODEBATTLE_DEFAULT_LANG_SLUG", "js")

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY"),
  firebase_autn_url: "https://identitytoolkit.googleapis.com/v1/accounts"

config :codebattle, :lobby_event_slug, System.get_env("CODEBATTLE_LOBBY_EVENT_SLUG")

config :codebattle, :oauth,
  github_client_id: System.get_env("GITHUB_CLIENT_ID", "ASFD"),
  github_client_secret: System.get_env("GITHUB_CLIENT_SECRET", "ASFD"),
  discord_client_id: System.get_env("DISCORD_CLIENT_ID", "ASFD"),
  discord_client_secret: System.get_env("DISCORD_CLIENT_SECRET", "ASFD"),
  external_client_id: System.get_env("EXTERNAL_CLIENT_ID", "ASFD"),
  external_client_secret: System.get_env("EXTERNAL_CLIENT_SECRET", "ASFD"),
  external_auth_url: System.get_env("EXTERNAL_AUTH_URL", "ASDF"),
  external_user_info_url: System.get_env("EXTERNAL_USER_INFO_URL", "ASFD"),
  external_avatar_url_template: System.get_env("EXTERNAL_AVATAR_URL_TEMPLATE", "ASFD")

config :codebattle, asserts_executor: Codebattle.AssertsService.Executor.Remote
config :codebattle, checker_executor: checker_executor
config :codebattle, collab_logo: System.get_env("CODEBATTLE_COLLAB_LOGO")
config :codebattle, collab_logo_minor: System.get_env("CODEBATTLE_COLLAB_LOGO_MINOR")
config :codebattle, default_locale: System.get_env("CODEBATTLE_DEFAULT_LOCALE", "en")

config :codebattle,
  deployed_at: System.get_env("DEPLOYED_AT") || Calendar.strftime(DateTime.utc_now(), "%c")

config :codebattle, force_redirect_url: System.get_env("CODEBATTLE_FORCE_REDIRECT_URL")

config :codebattle,
  guest_user_force_redirect_url: System.get_env("CODEBATTLE_GUEST_USER_FORCE_REDIRECT_URL")

config :codebattle, host: codebattle_host

config :codebattle,
  jitsi_api_key: System.get_env("JITSI_API_KEY", "")

config :codebattle, k8s_namespace: System.get_env("KUBERNETES_NAMESPACE", "default")
config :codebattle, tournament_rematch_timeout_ms: tournament_rematch_timeout_ms

config :phoenix_meta_tags,
  title: app_title,
  description: app_subtitle,
  url: codebattle_url,
  image:
    System.get_env(
      "CODEBATTLE_COLLAB_LOGO",
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
  http: [:inet6, port: runner_port],
  url: [host: runner_host, port: 81],
  secret_key_base: secret_key_base,
  server: true

config :runner, :runner_url, "http://runner.default.svc"
config :runner, container_killer: System.get_env("RUNNER_CONTAINER_KILLER", "") == "true"
config :runner, cpu_logger: System.get_env("RUNNER_CPU_LOGGER", "") == "true"

config :runner,
  max_parallel_containers_run: "CODEBATTLE_MAX_PARALLEL_CONTAINERS_RUN" |> System.get_env("16") |> String.to_integer()

config :runner, pull_docker_images: System.get_env("RUNNER_PULL_DOCKER_IMAGES", "") == "true"

config :runner,
  white_list_lang_slugs:
    "RUNNER_WHITE_LIST_LANG_SLUGS" |> System.get_env("") |> String.split(",") |> Enum.filter(&(&1 != ""))

config :sentry,
  dsn: System.get_env("SENTRY_DNS_URL"),
  environment_name: :prod,
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()]

config :sentry_fe, dsn: System.get_env("SENTRY_FE_DNS_URL") || System.get_env("SENTRY_DNS_URL")
