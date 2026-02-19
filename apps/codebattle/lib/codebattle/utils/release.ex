defmodule Codebattle.Utils.Release do
  @moduledoc false

  @app :codebattle

  def migrate do
    Application.ensure_all_started(:ssl)

    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(
          repo,
          &Ecto.Migrator.run(&1, :up, all: true),
          pool_size: migration_pool_size()
        )
    end
  end

  defp repos do
    Application.load(@app)
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp migration_pool_size do
    "CODEBATTLE_MIGRATION_POOL_SIZE"
    |> System.get_env("2")
    |> String.to_integer()
  end
end
