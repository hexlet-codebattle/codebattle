use Mix.Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :codebattle, CodebattleWeb.Endpoint,
  http: [port: 4001],
  server: true

config :phoenix_integration, endpoint: CodebattleWeb.Endpoint

# Print only warnings and errors during test
config :logger, level: :error

# Configure your database
config :codebattle, Codebattle.Repo,
  adapter: Ecto.Adapters.Postgres,
  username: System.get_env("CODEBATTLE_DB_USERNAME") || "postgres",
  password: System.get_env("CODEBATTLE_DB_PASSWORD") || "postgres",
  database: "codebattle_test",
  hostname: System.get_env("CODEBATTLE_DB_HOSTNAME") || "localhost",
  pool: Ecto.Adapters.SQL.Sandbox,
  ownership_timeout: 99_999_999

config :codebattle, Codebattle.Bot, timeout: 30

timeout =
  case System.get_env("CODEBATTLE_DOCKER_TEST_TIMEOUT") do
    nil -> 4000
    x -> Integer.parse(x) |> elem(0)
  end

config :codebattle, code_check_timeout: timeout
