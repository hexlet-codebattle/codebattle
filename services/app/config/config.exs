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
  url: [host: "localhost"],
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  render_errors: [view: CodebattleWeb.ErrorView, accepts: ~w(html json), layout: false],
  pubsub_server: CodebattleWeb.PubSub,
  live_view: [signing_salt: "asdfasdf"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :ueberauth, Ueberauth,
  providers: [
    github: {Ueberauth.Strategy.Github, [default_scope: "user:email", send_redirect_uri: false]},
    discord: {Ueberauth.Strategy.Discord, []}
  ]

config :ueberauth, Ueberauth.Strategy.Github.OAuth,
  client_id: System.get_env("GITHUB_CLIENT_ID", "ASFD"),
  client_secret: System.get_env("GITHUB_CLIENT_SECRET", "ASFD")

config :ueberauth, Ueberauth.Strategy.Discord.OAuth,
  client_id: System.get_env("DISCORD_CLIENT_ID", "ASFD"),
  client_secret: System.get_env("DISCORD_CLIENT_SECRET", "ASFD")

config :phoenix_gon, :json_library, Jason

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

config :codebattle, Codebattle.DockerLangsPuller, timeout: :timer.hours(7)

config :codebattle, checker_executor: Codebattle.CodeCheck.DockerExecutor
config :codebattle, tournament_match_timeout: 3 * 60
config :codebattle, tasks_provider: Codebattle.Game.TasksQueuesServer

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY"),
  firebase_autn_url: "https://identitytoolkit.googleapis.com/v1/accounts"

config :codebattle, admins: ["vtm", "ReDBrother"]

config :codebattle, restore_tournaments: false
config :codebattle, freeze_time: false
config :codebattle, load_dot_env_file: true
config :codebattle, use_prod_workers: false
config :codebattle, use_non_test_workers: true
config :codebattle, html_include_prod_scripts: false
config :codebattle, html_debug_mode: true

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
