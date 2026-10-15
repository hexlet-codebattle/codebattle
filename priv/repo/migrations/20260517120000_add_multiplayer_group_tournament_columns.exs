defmodule Codebattle.Repo.Migrations.AddMultiplayerGroupTournamentColumns do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:type, :string, default: "individual", null: false)
      add(:slice_count, :integer)
      add(:place_weight, :integer, default: 1, null: false)
      add(:scoring_strategy, :string, default: "diagonal_quadratic", null: false)
      add(:movement_strategy, :string, default: "mirrored_cascade", null: false)
      add(:inactive_rounds_to_leave, :integer, default: 2, null: false)
      add(:break_duration_seconds, :integer, default: 0, null: false)
    end

    alter table(:group_tournament_players) do
      add(:seed_score, :integer)
      add(:seed_duration_ms, :integer)
      add(:total_score, :integer, default: 0, null: false)
      add(:last_round_place, :integer)
      add(:consecutive_zero_rounds, :integer, default: 0, null: false)
    end

    alter table(:user_group_tournament_runs) do
      add(:duration_ms, :integer)
    end

    create(
      index(:group_tournament_players, [:group_tournament_id, :total_score],
        name: :group_tournament_players_group_tournament_id_total_score_index
      )
    )
  end
end
