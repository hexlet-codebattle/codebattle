defmodule PhoenixGon.Mixfile do
  use Mix.Project

  def project do
    [
      app: :phoenix_gon,
      version: "0.4.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.post": :test,
        "coveralls.json": :test,
        "coveralls.html": :test
      ],
      test_coverage: [tool: ExCoveralls, threshold: 60],
      description: description(),
      deps: deps()
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  def application do
    [extra_applications: [:logger]]
  end

  defp description do
    """
    PhoenixGon hex - your Phoenix variables in your JavaScript.
    """
  end

  # defp package do
  #   [
  #     name: :phoenix_gon,
  #     files: ~w{lib} ++ ~w{mix.exs README.md},
  #     maintainers: ["Marat Khusnetdinov"],
  #     licenses: ["MIT"],
  #     links: %{"GitHub" => "https://github.com/khusnetdinov/phoenix_gon"}
  #   ]
  # end

  defp deps do
    [
      {:jason, "~> 1.1"},
      {:phoenix_html, "~> 3.2"},
      {:plug, "~> 1.10"},
      {:recase, "~> 0.6"}
    ]
  end
end
