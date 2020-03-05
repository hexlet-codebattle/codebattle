import Config

port = System.fetch_env!("CODEBATTLE_PORT", "4000")
host = System.get_env("CODEBATTLE_HOSTNAME", "codebattle.hexlet.io")
secret_key_base = System.fetch_env!("CODEBATTLE_SECRET_KEY_BASE")
live_view_salt = System.fetch_env!("CODEBATTLE_LIVE_VIEW_SALT")

config :hr, HrWeb.Endpoint,
  http: [:inet6, port: port],
  url: [host: host, port: 80],
  cache_static_manifest: "priv/static/cache_manifest.json",
  secret_key_base: secret_key_base,
  live_view: [signing_salt: live_view_salt],
  server: true

config :hr, host: host

config :hr, Hr.Repo,
  adapter: Ecto.Adapters.Postgres,
  database: System.get_env("CODEBATTLE_DB_NAME"),
  ssl: true,
  port: System.get_env("CODEBATTLE_DB_PORT"),
  username: System.get_env("CODEBATTLE_DB_USERNAME"),
  password: System.get_env("CODEBATTLE_DB_PASSWORD"),
  database: System.get_env("CODEBATTLE_DB_NAME"),
  hostname: System.get_env("CODEBATTLE_DB_HOSTNAME"),
  pool_size: 7
