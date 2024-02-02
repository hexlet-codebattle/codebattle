# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
import Config
# General application configuration
config :codebattle, ecto_repos: [Codebattle.Repo]

# Configures the endpoint
config :codebattle, CodebattleWeb.Endpoint,
  http: [
    port: System.get_env("CODEBATTLE_PORT", "4000"),
    transport_options: [
      max_connections: 30000,
      num_acceptors: 500
    ]
  ],
  url: [host: "localhost"],
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  render_errors: [view: CodebattleWeb.ErrorView, accepts: ~w(html json), layout: false],
  pubsub_server: CodebattleWeb.PubSub,
  live_view: [signing_salt: "asdfasdf"]

# Configures the runner endpoint
config :runner, RunnerWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  render_errors: [view: RunnerWeb.ErrorView, accepts: ~w(json), layout: false],
  pubsub_server: Runner.PubSub

config :fun_with_flags, :persistence,
  adapter: FunWithFlags.Store.Persistent.Ecto,
  repo: Codebattle.Repo,
  ecto_table_name: "feature_flags"

config :fun_with_flags, :cache_bust_notifications, enabled: false

config :porcelain, goon_warn_if_missing: false

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :codebattle, github_oauth_client: HTTPoison
config :codebattle, discord_oauth_client: HTTPoison

config :codebattle, :oauth,
  github_client_id: System.get_env("GITHUB_CLIENT_ID", "ASFD"),
  github_client_secret: System.get_env("GITHUB_CLIENT_SECRET", "ASFD"),
  discord_client_id: System.get_env("DISCORD_CLIENT_ID", "ASFD"),
  discord_client_secret: System.get_env("DISCORD_CLIENT_SECRET", "ASFD")

config :codebattle, CodebattleWeb.Gettext,
  priv: "priv/gettext",
  default_locale: "en"

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

config :codebattle, Codebattle.Bot, min_bot_step_timeout: 1_000

config :codebattle, checker_executor: Codebattle.CodeCheck.Executor.Remote
config :codebattle, asserts_executor: Codebattle.AssertsService.Executor.Remote

config :runner, :executor,
  runner_url: "http://localhost:4001",
  api_key: "x-key"

config :codebattle, tournament_match_timeout: 3 * 60
config :codebattle, max_alive_tournaments: 15
config :codebattle, tasks_provider: Codebattle.Game.TasksQueuesServer

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY"),
  firebase_autn_url: "https://identitytoolkit.googleapis.com/v1/accounts"

config :codebattle, admins: ["admin"]
config :codebattle, restore_tournaments: false
config :codebattle, freeze_time: false
config :codebattle, load_dot_env_file: true
config :codebattle, import_github_tasks: false
config :codebattle, user_rank_server: true
config :codebattle, create_bot_games: true
config :codebattle, use_external_js: false
config :codebattle, html_debug_mode: true
config :codebattle, fake_html_to_image: false
config :codebattle, use_only_token_auth: false
config :codebattle, show_extension_popup: true
config :codebattle, app_version: System.get_env("APP_VERSION", "dev")
config :codebattle, tournament_rematch_timeout_ms: 5000
config :codebattle, force_redirect_url: ""
config :codebattle, allow_guests: true
config :codebattle, record_games: true
config :codebattle, use_presence: true

config :codebattle,
  deployed_at: System.get_env("DEPLOYED_AT") || Calendar.strftime(DateTime.utc_now(), "%c")

config :runner, load_dot_env_file: true
config :runner, pull_docker_images: false
config :runner, runner_cpu_logger: false
config :runner, max_parallel_containers_run: 16
config :runner, Runner.DockerImagesPuller, timeout: :timer.hours(7)
config :runner, fake_docker_run: false

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
