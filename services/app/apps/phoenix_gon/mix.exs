defmodule PhoenixGon.Mixfile do
  use Mix.Project

  def project do
    [
      app: :phoenix_gon,
      version: "0.4.0",
      elixir: "~> 1.5",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      build_embedded: Mix.env() == :prod,
      start_permanent: Mix.env() == :prod,
      description: description(),
      deps: deps()
    ]
  end

  def application do
    [applications: [:logger]]
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
