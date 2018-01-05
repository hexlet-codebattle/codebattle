use Mix.Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :codebattle, CodebattleWeb.Endpoint,
  http: [port: 4001],
  server: false

config :phoenix_integration,
  endpoint: Codebattle.Endpoint

# Print only warnings and errors during test
config :logger, level: :warn

# Configure your database
config :codebattle, Codebattle.Repo,
  adapter: Ecto.Adapters.Postgres,
  username: "postgres",
  password: "",
  database: "codebattle_test",
  hostname: "db",
  pool: Ecto.Adapters.SQL.Sandbox,
  ownership_timeout: 99_999_999

config :codebattle, Codebattle.Bot,
  timeout: 70
