defmodule Codebattle.Utils.Release do
  @moduledoc false

  @app :codebattle

  def migrate do
    Application.ensure_all_started(:ssl)
    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  defp repos do
    Application.load(@app)
    Application.fetch_env!(@app, :ecto_repos)
  end
end
