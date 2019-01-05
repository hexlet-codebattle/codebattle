defmodule Codebattle.Mixfile do
  @moduledoc """
  """

  use Mix.Project

  def project do
    [
      app: :codebattle,
      version: "0.0.12",
      elixir: "~> 1.7",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: [:phoenix, :gettext] ++ Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      # test_coverage: [tool: ExCoveralls],
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.post": :test,
        "coveralls.html": :test
      ],
      deps: deps()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Codebattle.Application, []},
      extra_applications: [
        :runtime_tools,
        :phoenix,
        :phoenix_pubsub,
        :phoenix_html,
        :cowboy,
        :logger,
        :gettext,
        :phoenix_gon,
        :phoenix_ecto,
        :postgrex,
        :yaml_elixir,
        :ueberauth,
        :ueberauth_github,
        :gproc,
        :one_signal,
      ]
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
      {:phoenix, "~> 1.3"},
      {:phoenix_pubsub, "~> 1.0"},
      {:phoenix_ecto, "~> 3.0"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 2.10"},
      {:gettext, "~> 0.11"},
      {:cowboy, "~> 1.0"},
      {:plug_cowboy, "~> 1.0"},
      {:phoenix_slime, "~> 0.8.0"},
      {:ueberauth, "~> 0.5"},
      {:ueberauth_github, "~> 0.7"},
      {:gproc, "~> 0.6"},
      {:fsm, "~> 0.3"},
      {:poison, "~> 3.1.0", override: true},
      {:phoenix_gon, "~> 0.2.0"},
      {:text_delta, "~> 1.3.0"},
      {:yaml_elixir, "~> 1.1"},
      {:temp, "~> 0.4"},
      {:logger_file_backend, "~> 0.0.10"},
      {:atomic_map, "~> 0.8"},
      {:envy, "~> 1.1.1"},
      {:one_signal,  git: "https://github.com/vtm9/one_signal.git"},
      {:paginator, "~> 0.6"},

      # dev_and_test
      {:credo, "~> 0.8", only: [:dev, :test], runtime: false},

      # dev
      {:phoenix_live_reload, "~> 1.0", only: :dev},

      # test
      {:mock, "~> 0.3.0", only: :test},
      {:phoenix_integration, "~> 0.5", only: :test},
      {:excoveralls, "~> 0.7", only: :test},
      {:faker, "~> 0.8", only: :test},
      {:ex_machina, "~> 2.0", only: :test},
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
