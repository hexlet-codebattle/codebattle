# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
use Mix.Config

config :codebattle,
  alpine_docker_command_template:
    "docker run --rm --net none ~s ~s timeout -s 9 -t 10 make --silent test",
  ubuntu_docker_command_template:
    "docker run --rm --net none ~s ~s timeout -s 9 10s make --silent test",
  alpine_docker_command_compile_template:
    "docker run --net none ~s ~s timeout -s 9 -t 10 make --silent test-compile",
  ubuntu_docker_command_compile_template:
    "docker run --net none ~s ~s timeout -s 9 10s make --silent test-compile"

# General application configuration
config :codebattle, ecto_repos: [Codebattle.Repo]

# Configures the endpoint
config :codebattle, CodebattleWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "zQ3/vT3oIVM94qXO7IgWeAqbLSAyGA9em6fdBw7OdbDnbeotEkWYANrjJWYNWpd/",
  render_errors: [view: CodebattleWeb.ErrorView, accepts: ~w(html json)],
  pubsub: [name: Codebattle.PubSub, adapter: Phoenix.PubSub.PG2]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :template_engines,
  slim: PhoenixSlime.Engine,
  slime: PhoenixSlime.Engine,
  slimleex: PhoenixSlime.LiveViewEngine

config :phoenix_slime, :use_slim_extension, true

config :ueberauth, Ueberauth,
  providers: [
    github: {Ueberauth.Strategy.Github, [default_scope: "user:email", send_redirect_uri: false]}
  ]

config :ueberauth, Ueberauth.Strategy.Github.OAuth,
  client_id: System.get_env("GITHUB_CLIENT_ID"),
  client_secret: System.get_env("GITHUB_CLIENT_SECRET")

config :codebattle, CodebattleWeb.Gettext,
  priv: "priv/gettext",
  default_locale: "en"

config :one_signal, OneSignal,
  app_id: System.get_env("ONESIGNAL_APP_ID"),
  api_key: System.get_env("ONESIGNAL_API_KEY")

config :scrivener_html,
  routes_helper: CodebattleWeb.Router.Helpers

config :phoenix_meta_tags,
  title: "Hexlet Codebattle",
  description: "Game for programmers",
  url: "https://codebattle.hexlet.io",
  image: "https://raw.githubusercontent.com/v1valasvegan/og-test/master/codebattle.png",
  "og:text": "Hexlet Codebattle",
  fb: %{
    name: "Hexlet Codebattle",
    size: %{
      width: 100,
      height: 200,
      position: %{
        x: 10,
        y: 15
      }
    }
  }

config :codebattle, CodebattleWeb.Endpoint, live_view: [signing_salt: "asdfasdf"]

config :codebattle, Codebattle.Bot,
  timeout_start_playbook: 2_000,
  min_bot_player_speed: 1_000

config :codebattle, Codebattle.DockerLangsPuller, timeout: 5_000 * 60

config :codebattle, checker_adapter: Codebattle.CodeCheck.Checker
config :codebattle, tournament_match_timeout: 3 * 60

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
