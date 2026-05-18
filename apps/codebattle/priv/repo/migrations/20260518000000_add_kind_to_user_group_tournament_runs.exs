defmodule Codebattle.Repo.Migrations.AddKindToUserGroupTournamentRuns do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:user_group_tournament_runs) do
      add(:kind, :string, default: "user", null: false)
    end

    create(
      index(:user_group_tournament_runs, [:group_tournament_id, :user_group_tournament_id, :kind],
        name: :user_group_tournament_runs_gt_ugt_kind_index
      )
    )
  end
end
