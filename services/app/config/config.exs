# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
use Mix.Config

config :codebattle,
  alpine_docker_command_template:
    "docker run --rm -m 400m --cpus=1 --net none ~s ~s ~s timeout -s 9 -t 10 make --silent test checker_name=~s",
  ubuntu_docker_command_template:
    "docker run --rm -m 400m --cpus=1 --net none ~s ~s ~s timeout -s 9 10s make --silent test checker_name=~s",
  alpine_docker_command_compile_template:
    "docker run -m 400m --cpus=1 --net none ~s ~s ~s timeout -s 9 -t 10 make --silent test-compile",
  ubuntu_docker_command_compile_template:
    "docker run -m 400m --cpus=1 --net none ~s ~s ~s timeout -s 9 10s make --silent test-compile"

# General application configuration
config :codebattle, ecto_repos: [Codebattle.Repo]

# Configures the endpoint
config :codebattle, CodebattleWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  render_errors: [view: CodebattleWeb.ErrorView, accepts: ~w(html json)],
  pubsub_server: :cb_pubsub,
  live_view: [signing_salt: "asdfasdf"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :phoenix, :template_engines,
  slim: PhoenixSlime.Engine,
  slime: PhoenixSlime.Engine,
  slimleex: PhoenixSlime.LiveViewEngine

config :phoenix_slime, :use_slim_extension, true

config :ueberauth, Ueberauth,
  providers: [
    github: {Ueberauth.Strategy.Github, [default_scope: "user:email", send_redirect_uri: false]},
    discord: {Ueberauth.Strategy.Discord, []}
  ]

config :ueberauth, Ueberauth.Strategy.Github.OAuth,
  client_id: System.get_env("GITHUB_CLIENT_ID"),
  client_secret: System.get_env("GITHUB_CLIENT_SECRET")

config :ueberauth, Ueberauth.Strategy.Discord.OAuth,
  client_id: System.get_env("DISCORD_CLIENT_ID"),
  client_secret: System.get_env("DISCORD_CLIENT_SECRET")

config :phoenix_gon, :json_library, Jason

config :codebattle, CodebattleWeb.Gettext,
  priv: "priv/gettext",
  default_locale: "en"

config :scrivener_html,
  routes_helper: CodebattleWeb.Router.Helpers

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

config :codebattle, Codebattle.Bot,
  timeout_start_playbook: 10_000,
  prep_time: 120_000,
  min_bot_player_speed: 1_000

config :codebattle, Codebattle.DockerLangsPuller, timeout: :timer.hours(7)

config :codebattle, checker_adapter: Codebattle.CodeCheck.DockerChecker
config :codebattle, tournament_match_timeout: 3 * 60

config :codebattle, Codebattle.Analitics, max_size_activity_server: 10_000

config :codebattle, :firebase,
  sender_id: System.get_env("FIREBASE_SENDER_ID"),
  api_key: System.get_env("FIREBASE_API_KEY")

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"

