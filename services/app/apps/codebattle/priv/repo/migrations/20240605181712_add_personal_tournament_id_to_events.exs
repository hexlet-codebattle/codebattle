defmodule Codebattle.Repo.Migrations.AddPersonalTournamentIdToEvents do
  use Ecto.Migration

  def change do
    alter table(:events) do
      add :personal_tournament_id, :integer
    end
  end
end
