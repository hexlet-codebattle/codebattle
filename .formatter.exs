# Used by "mix format"
[
  plugins: [Styler, Phoenix.LiveView.HTMLFormatter],
  styler: [minimum_supported_elixir_version: "1.14.0"],
  inputs: [
    "*.{heex,ex,exs}",
    "priv/*/seeds.exs",
    "{config,lib,test}/**/*.{heex,ex,exs}",
    "apps/*/*.{heex,ex,exs}",
    "apps/*/priv/*/seeds.exs",
    "apps/*/{config,lib,test}/**/*.{heex,ex,exs}"
  ]
]
