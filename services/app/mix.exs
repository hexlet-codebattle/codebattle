defmodule CodebattleUmbrella.MixProject do
  use Mix.Project

  def project do
    [
      name: "Codebattle Umbrella",
      apps_path: "apps",
      version: "0.1.0",
      start_permanent: Mix.env() == :prod,
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.post": :test,
        "coveralls.json": :test,
        "coveralls.html": :test
      ],
      test_coverage: [tool: ExCoveralls],
      deps: [
        {:excoveralls, "~> 0.13", only: :test}
      ]
    ]
  end
end
