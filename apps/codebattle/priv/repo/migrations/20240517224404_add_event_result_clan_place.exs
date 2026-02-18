defmodule Codebattle.Repo.Migrations.AddEventResultClanPlace do
  use Ecto.Migration

  def change do
    alter table(:event_results) do
      add :clan_place, :integer
    end
  end
end
