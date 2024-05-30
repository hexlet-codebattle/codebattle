defmodule Codebattle.Repo.Migrations.AddPlayerIdsToGames do
  use Ecto.Migration

  def change do
    alter table(:games) do
      add :player_ids, {:array, :integer}
    end

    create index(:games, [:player_ids], using: :gin)
  end
end
