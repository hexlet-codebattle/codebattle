defmodule Codebattle.Repo.Migrations.AddRoundPositionToUserGroupTournamentRuns do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_group_tournament_runs) do
      add(:round_position, :integer)
    end
  end
end
