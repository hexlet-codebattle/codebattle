defmodule Codebattle.Repo.Migrations.AddScoreToUserGroupTournamentRuns do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_group_tournament_runs) do
      add(:score, :integer)
    end
  end
end
