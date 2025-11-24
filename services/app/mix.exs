defmodule CodebattleUmbrella.MixProject do
  use Mix.Project

  def project do
    [
      name: "Codebattle Umbrella",
      apps_path: "apps",
      version: "0.1.0",
      start_permanent: Mix.env() == :prod,
      test_coverage: [tool: ExCoveralls, threshold: 60],
      aliases: aliases(),
      deps: [
        {:mix_audit, "~> 2.1", only: [:dev, :test], runtime: false},
        {:dialyxir, "~> 1.0", only: [:dev, :test], runtime: false},
        {:excoveralls, "~> 0.13", only: :test},
      ],
      listeners: [Phoenix.CodeReloader],
      dialyzer: [
        paths: [
          Path.join(File.cwd!(), "_build/dev/lib/codebattle/ebin"),
          Path.join(File.cwd!(), "_build/dev/lib/phoenix_gon/ebin"),
          Path.join(File.cwd!(), "_build/dev/lib/runner/ebin")
        ],
        plt_file: {:no_warn, "priv/plts/dialyzer.plt"},
        plt_add_apps: [:mix, :ex_unit]
      ],
      releases: [
        codebattle: [
          applications: [codebattle: :permanent],
          validate_compile_env: false
        ],
        runner: [
          applications: [runner: :permanent],
          validate_compile_env: false
        ]
      ]
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

  defp aliases do
    [ ]
  end
end
