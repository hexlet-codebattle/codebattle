defmodule Codebattle.Repo.Migrations.AddSliceIndexToUserGroupTournamentRuns do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_group_tournament_runs) do
      add(:slice_index, :integer)
    end

    create(index(:user_group_tournament_runs, [:group_tournament_id, :slice_index]))
  end
end
