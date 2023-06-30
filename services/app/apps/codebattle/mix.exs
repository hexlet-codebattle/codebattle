defmodule Codebattle.MixProject do
  use Mix.Project

  def project do
    [
      app: :codebattle,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      test_coverage: [tool: ExCoveralls, threshold: 60],
      elixirc_options: [warnings_as_errors: false]
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Codebattle.Application, []},
      extra_applications: [:runtime_tools, :logger, :os_mon],
      included_applications: [:runner]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:runner, in_umbrella: true, runtime: false},
      {:cowboy, "~> 2.8"},
      {:earmark, "~> 1.4"},
      {:ecto_sql, "~> 3.6"},
      {:ecto_psql_extras, "~> 0.2"},
      {:envy, "~> 1.1.1"},
      {:gettext, "~> 0.18"},
      {:html_to_image, github: "koss-lebedev/html_to_image"},
      {:httpoison, "~> 2.0"},
      {:jason, "~> 1.2"},
      {:phoenix, "~> 1.7"},
      {:phoenix_client, github: "vtm9/phoenix_client"},
      {:phoenix_ecto, "~> 4.4"},
      {:phoenix_gon, "~> 0.4", github: "bonfire-networks/phoenix_gon"},
      {:phoenix_html, "~> 3.2"},
      {:phoenix_view, "~> 2.0"},
      {:phoenix_live_dashboard, "~> 0.8.0"},
      {:phoenix_live_view, "~> 0.18"},
      {:phoenix_meta_tags, "~> 0.1.8"},
      {:plug_cowboy, "~> 2.5"},
      {:postgrex, ">= 0.0.0"},
      {:sentry, "~> 8.0"},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"},
      {:text_delta, "~> 1.4.0"},
      {:timex, "~> 3.6"},
      {:typed_struct, "~> 0.3"},
      {:yaml_elixir, "~> 2.4"},
      {:exfake, "~> 1.0.0"},

      # dev_and_test
      {:credo, "~> 1.6", only: [:dev, :test], runtime: false},

      # dev
      {:phoenix_live_reload, "~> 1.3", only: :dev},

      # test
      {:ex_machina, "~> 2.4", only: :test},
      {:excoveralls, "~> 0.13", only: :test},
      {:floki, "~> 0.29", only: :test},
      {:mock, "~> 0.3.5", only: :test},
      {:phoenix_integration, "~> 0.8", only: :test}
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
