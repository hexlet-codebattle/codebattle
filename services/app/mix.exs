defmodule Codebattle.Mixfile do
  use Mix.Project

  def project do
    [
      app: :codebattle,
      version: "0.1.0",
      elixir: "~> 1.10",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: [:phoenix, :gettext] ++ Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.post": :test,
        "coveralls.json": :test,
        "coveralls.html": :test
      ],
      test_coverage: [tool: ExCoveralls],
      deps: deps(),
      elixirc_options: [warnings_as_errors: false]
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Codebattle.Application, []},
      extra_applications: [:ssl, :mix, :runtime_tools, :logger, :os_mon]
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
      {:phoenix, "~> 1.5.5", override: true},
      {:phoenix_ecto, "~> 4.2"},
      {:phoenix_live_view, "~> 0.15"},
      {:postgrex, "~> 0.15.6"},
      {:phoenix_html, "~> 2.14"},
      {:phoenix_live_dashboard, "~> 0.4"},
      {:telemetry_metrics, "~> 0.5.0"},
      {:telemetry_poller, "~> 0.5.0"},
      {:gettext, "~> 0.18"},
      {:cowboy, "~> 2.8"},
      {:plug_cowboy, "~> 2.4"},
      {:phoenix_slime, "~> 0.13"},
      {:slime, "~> 1.2"},
      {:ueberauth, "~> 0.6"},
      {:ueberauth_github, "~> 0.7"},
      {:gproc, "~> 0.8"},
      {:fsm, "~> 0.3"},
      {:phoenix_gon, "~> 0.4.0"},
      {:text_delta, "~> 1.4.0"},
      {:yaml_elixir, "~> 2.4"},
      {:temp, "~> 0.4"},
      {:atomic_map, "~> 0.8"},
      {:envy, "~> 1.1.1"},
      {:paginator, "~> 1.0.1"},
      {:scrivener_ecto, "~> 2.5"},
      {:ecto_psql_extras, "~> 0.2"},
      {:scrivener_html, "~> 1.8"},
      {:phoenix_client, "~> 0.11"},
      {:websocket_client, "~> 1.3"},
      {:jason, "~> 1.2"},
      {:websockex, "~> 0.4.2"},
      {:socket, "~> 0.3"},
      {:timex, "~> 3.6"},
      {:deep_merge, "~> 1.0"},
      {:httpoison, "~> 1.5.0"},
      {:poison, "~> 3.0"},
      {:phoenix_meta_tags, "~> 0.1.8"},
      {:gen_state_machine, "~> 2.1"},

      # dev_and_test
      {:credo, "~> 1.4", only: [:dev, :test], runtime: false},

      # dev
      {:phoenix_live_reload, "~> 1.2", only: :dev},

      # test
      {:floki, "~> 0.29", only: :test},
      {:mock, "~> 0.3.5", only: :test},
      {:phoenix_integration, "~> 0.8", only: :test},
      {:excoveralls, "~> 0.13", only: :test},
      {:faker, "~> 0.15", only: :test},
      {:ex_machina, "~> 2.4", only: :test}
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
