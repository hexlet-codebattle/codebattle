# Used by "mix format"
[
  import_deps: [:ecto, :ecto_sql, :phoenix],
  subdirectories: ["priv/*/migrations"],
  plugins: [Styler, Phoenix.LiveView.HTMLFormatter],
  styler: [minimum_supported_elixir_version: "1.14.0"],
  inputs: [
    "*.{heex,ex,exs}",
    "priv/*/seeds.exs",
    "{config,lib,test}/**/*.{heex,ex,exs}"
  ]
]
