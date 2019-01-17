# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
use Mix.Config

config :codebattle,
  alpine_docker_command_template: "docker run --rm ~s ~s timeout -s 9 -t 10 make --silent test",
  ubuntu_docker_command_template: "docker run --rm ~s ~s timeout -s 9 10s make --silent test"

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
  slime: PhoenixSlime.Engine

config :phoenix_slime, :use_slim_extension, true

config :ueberauth, Ueberauth,
  providers: [
    github: {Ueberauth.Strategy.Github, [default_scope: "user:email"]}
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

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
