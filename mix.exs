defmodule Codebattle.MixProject do
  use Mix.Project

  def project do
    [
      app: :codebattle,
      name: "Codebattle",
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      listeners: [Phoenix.CodeReloader],
      test_coverage: [tool: ExCoveralls, threshold: 99],
      hex: [ignore_advisories: []],
      dialyzer: [
        plt_file: {:no_warn, "priv/plts/dialyzer.plt"},
        plt_add_apps: [:mix, :ex_unit]
      ],
      releases: [
        codebattle: [validate_compile_env: false]
      ],
      elixirc_options: [warnings_as_errors: false]
    ]
  end

  def cli do
    [
      preferred_envs: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.post": :test,
        "coveralls.json": :test,
        "coveralls.html": :test
      ]
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Codebattle.Application, []},
      extra_applications: extra_applications()
    ]
  end

  defp extra_applications do
    apps = [:runtime_tools, :logger]
    if Mix.env() == :test, do: apps, else: [:os_mon | apps]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:bandit, "~> 1.0"},
      {:bcrypt_elixir, "~> 3.0"},
      {:cachex, "~> 4.1"},
      {:chromic_pdf, "~> 1.17"},
      {:delta, github: "slab/delta-elixir"},
      {:diff_match_patch, "~> 0.3.0"},
      {:mdex, "~> 0.14.2"},
      {:ecto_psql_extras, "~> 0.2"},
      {:ecto_sql, "~> 3.6"},
      {:envy, "~> 1.1.1"},
      {:finch, "~> 0.16"},
      {:fun_with_flags, "~> 1.11"},
      {:fun_with_flags_ui, "~> 1.0"},
      {:gettext, "~> 1.0"},
      {:inertia, "~> 3.0"},
      {:oban, "~> 2.19"},
      {:oban_web, "~> 2.11"},
      {:nimble_csv, "~> 1.1"},
      {:phoenix, "~> 1.8"},
      {:mint_web_socket, "~> 1.0.6"},
      {:phoenix_ecto, "~> 4.4"},
      {:phoenix_html, "~> 4.3"},
      {:phoenix_html_helpers, "~> 1.0"},
      {:phoenix_live_dashboard, "~> 0.9.1"},
      {:phoenix_live_view, "~> 1.1"},
      {:phoenix_view, "~> 2.0"},
      {:plug, "~> 1.14"},
      {:porcelain, "~> 2.0"},
      {:postgrex, ">= 0.0.0"},
      {:recon, "~> 2.5"},
      {:req, "~> 0.5"},
      {:sentry, "~> 14.0"},
      {:statistics, "~> 0.6"},
      {:telemetry_metrics, "~> 1.1"},
      {:telemetry_poller, "~> 1.0"},
      {:temp, "~> 0.4"},
      {:typed_struct, "~> 0.3"},
      {:tzdata, "~> 1.1"},

      # dev_and_test
      {:dialyxir, "~> 1.0", only: [:dev, :test], runtime: false},
      {:credo, "~> 1.6", only: [:dev, :test], runtime: false},
      {:styler, "~> 1.4", only: [:dev, :test], runtime: false},
      {:mix_audit, "~> 2.1", only: [:dev, :test], runtime: false},
      # dev
      {:phoenix_live_reload, "~> 1.3", only: :dev},
      {:tidewave, "~> 0.5", only: :dev},

      # test
      {:ex_machina, "~> 2.4", only: :test},
      {:excoveralls, "~> 0.13", only: :test},
      {:floki, "~> 0.29", only: :test},
      {:lazy_html, ">= 0.1.0", only: :test},
      {:mimic, "~> 2.3", only: :test}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to create, migrate and run the seeds file at once:
  #
  #     $ mix ecto.setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate", "test"]
    ]
  end
end
