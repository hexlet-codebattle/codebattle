defmodule Codebattle.Repo.Migrations.AddCheaterIdsToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add :cheater_ids, {:array, :integer}, default: [], null: false
    end
  end
end
