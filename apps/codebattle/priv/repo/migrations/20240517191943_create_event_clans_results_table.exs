defmodule Codebattle.Repo.Migrations.CreateEventClansResultsTable do
  use Ecto.Migration

  def change do
    create table(:event_clan_results) do
      add :event_id, :integer
      add :clan_id, :integer
      add :players_count, :integer
      add :score, :integer
      add :place, :integer
    end

    alter table(:event_results) do
      add :place, :integer
    end

    create unique_index(:event_clan_results, [:event_id, :clan_id])
  end
end
