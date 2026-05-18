defmodule Codebattle.Repo.Migrations.AddGroupTournamentRoundScores do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:group_tournament_round_scores) do
      add(:group_tournament_id, references(:group_tournaments, on_delete: :delete_all), null: false)
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:run_id, references(:user_group_tournament_runs, on_delete: :nilify_all))
      add(:round_position, :integer, null: false)
      add(:slice_index, :integer, null: false)
      add(:place, :integer)
      add(:score, :integer, default: 0, null: false)

      timestamps()
    end

    create(
      unique_index(:group_tournament_round_scores, [:group_tournament_id, :user_id, :round_position],
        name: :group_tournament_round_scores_tournament_user_round_index
      )
    )

    create(index(:group_tournament_round_scores, [:group_tournament_id, :round_position]))
  end
end
