use Mix.Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :codebattle, CodebattleWeb.Endpoint,
  http: [port: 4001],
  server: false

# Print only warnings and errors during test
config :logger, level: :warn

# Configure your database
config :codebattle, Codebattle.Repo,
  adapter: Ecto.Adapters.Postgres,
  username: System.get_env("CODEBATTLE_DATABASE_USERNAME"),
  password: System.get_env("CODEBATTLE_DATABASE_PASSWORD"),
  database: "codebattle_test",
  hostname: System.get_env("CODEBATTLE_DATABASE_HOSTNAME"),
  pool: Ecto.Adapters.SQL.Sandbox
