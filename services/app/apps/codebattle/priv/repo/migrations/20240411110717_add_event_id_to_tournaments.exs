defmodule Codebattle.Repo.Migrations.AddEventIdToTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:event_id, :integer)
    end
  end
end
