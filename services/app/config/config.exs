# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
import Config

# TODO: use false on prod
config :codebattle, ChromicPDF, on_demand: true
config :codebattle, Codebattle.Bot, min_bot_step_timeout: 1_000

config :codebattle, CodebattleWeb.BotEndpoint,
  http: [
    port: "4002"
  ],
  url: [host: "localhost"],
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  pubsub_server: CodebattleWeb.PubSub

# Configures the endpoint
config :codebattle, CodebattleWeb.Endpoint,
  http: [port: System.get_env("CODEBATTLE_PORT", "4000")],
  adapter: Bandit.PhoenixAdapter,
  url: [host: "localhost"],
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  render_errors: [view: CodebattleWeb.ErrorView, accepts: ~w(html json), layout: false],
  pubsub_server: CodebattleWeb.PubSub,
  live_view: [signing_salt: "asdfasdf"]

config :codebattle, CodebattleWeb.Gettext,
  priv: "priv/gettext",
  default_locale: "en"

config :codebattle, :api_key, "x-key"
config :codebattle, :app_subtitle, "by Hexlet’s community"
config :codebattle, :app_title, "Hexlet Codebattle"
config :codebattle, :base_user_path, "/"
config :codebattle, :default_lang_slug, "js"

config :codebattle, :external,
  app_name: "Codebattle External",
  app_slogan: "Make codebattle<br>great again",
  app_login_button: "Login with External ID",
  app_login_description: "Login with External system to play with your friends"

config :codebattle, :fake_html_to_image, true

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY"),
  firebase_autn_url: "https://identitytoolkit.googleapis.com/v1/accounts"

config :codebattle, :logo_title, "Hexlet Codebattle"

config :codebattle, :oauth,
  github_client_id: System.get_env("GITHUB_CLIENT_ID", "ASFD"),
  github_client_secret: System.get_env("GITHUB_CLIENT_SECRET", "ASFD"),
  discord_client_id: System.get_env("DISCORD_CLIENT_ID", "ASFD"),
  discord_client_secret: System.get_env("DISCORD_CLIENT_SECRET", "ASFD"),
  external_client_id: System.get_env("EXTERNAL_CLIENT_ID", "ASFD"),
  external_client_secret: System.get_env("EXTERNAL_CLIENT_SECRET", "ASFD"),
  external_auth_url: System.get_env("EXTERNAL_AUTH_URL", "ASFD"),
  external_user_info_url: System.get_env("EXTERNAL_USER_INFO_URL", "ASFD"),
  external_avatar_url_template: System.get_env("EXTERNAL_AVATAR_URL_TEMPLATE", "ASFD")

config :codebattle, :start_create_bot_timeout, to_timeout(second: 3)
config :codebattle, app_version: System.get_env("APP_VERSION", "dev")
# config :codebattle, checker_executor: Codebattle.CodeCheck.Executor.RemoteRust
config :codebattle, asserts_executor: Codebattle.AssertsService.Executor.Remote
config :codebattle, chat_bot_token: System.get_env("CODEBATTLE_CHAT_BOT_TOKEN", "chat_bot")
config :codebattle, checker_executor: Codebattle.CodeCheck.Executor.RemoteDockerRun
config :codebattle, default_locale: System.get_env("CODEBATTLE_DEFAULT_LOCALE", "en")

config :codebattle,
  deployed_at: System.get_env("DEPLOYED_AT") || Calendar.strftime(DateTime.utc_now(), "%c")

config :codebattle, dev_sign_in: true
# General application configuration
config :codebattle, ecto_repos: [Codebattle.Repo]
config :codebattle, fake_html_to_image: false
config :codebattle, free_users_redirect_url: "/"
config :codebattle, freeze_time: false
config :codebattle, html_debug_mode: true

config :codebattle,
  jitsi_api_key: System.get_env("JITSI_API_KEY", "")

config :codebattle, load_dot_env_file: true
config :codebattle, max_alive_tournaments: 15
config :codebattle, store_playbook_async: true
config :codebattle, tasks_provider: Codebattle.Game.TasksQueuesServer
config :codebattle, tournament_match_timeout: 3 * 60
config :codebattle, tournament_rematch_timeout_ms: 2000
config :codebattle, user_rank_server: true

config :fun_with_flags, :cache, enabled: true
config :fun_with_flags, :cache_bust_notifications, enabled: false

config :fun_with_flags, :persistence,
  adapter: FunWithFlags.Store.Persistent.Ecto,
  repo: Codebattle.Repo,
  ecto_table_name: "feature_flags"

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :phoenix_meta_tags,
  title: "Hexlet Codebattle • Game for programmers",
  description:
    "Free online game for programmers. No ads, registration from github. Solve Tasks with the bot, friends or random players.",
  url: "https://codebattle.hexlet.io",
  image: "https://codebattle.hexlet.io/assets/images/opengraph-main.png",
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

config :porcelain, goon_warn_if_missing: false

config :runner, Runner.DockerImagesPuller, timeout: to_timeout(hour: 7)

# Configures the runner endpoint
config :runner, RunnerWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  render_errors: [view: RunnerWeb.ErrorView, accepts: ~w(json), layout: false],
  pubsub_server: Runner.PubSub

config :runner, :runner_url, "http://localhost:4001"
config :runner, fake_docker_run: false
config :runner, load_dot_env_file: true
config :runner, max_parallel_containers_run: 16
config :runner, pull_docker_images: false
config :runner, runner_container_killer: false
config :runner, runner_cpu_logger: false
config :runner, white_list_lang_slugs: []

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
