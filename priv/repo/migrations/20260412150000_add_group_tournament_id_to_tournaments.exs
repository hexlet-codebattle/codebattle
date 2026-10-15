defmodule Codebattle.Repo.Migrations.AddGroupTournamentIdToTournaments do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:group_tournament_id, :integer)
    end
  end
end
