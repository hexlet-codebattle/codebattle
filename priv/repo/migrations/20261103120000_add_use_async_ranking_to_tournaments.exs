defmodule Codebattle.Repo.Migrations.AddUseAsyncRankingToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add :use_async_ranking, :boolean, default: false, null: false
    end
  end
end
