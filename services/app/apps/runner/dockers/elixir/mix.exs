defmodule Checker.MixProject do
  use Mix.Project

  def project do
    [
      app: :checker,
      version: "0.1.0",
      elixir: "~> 1.13",
      start_permanent: false,
      deps: deps(),
      escript: escript(),
      elixirc_paths: ["."],
      elixirc_options: [ignore_module_conflict: true]
    ]
  end

  def application do
    [
      extra_applications: [:ex_unit]
    ]
  end

  defp deps do
    [
      {:jason, "~> 1.4.0"}
      # Add other dependencies as needed
    ]
  end

  defp escript do
    [
      main_module: Checker,
      app: nil
    ]
  end
end
