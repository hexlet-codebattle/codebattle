defmodule Codebattle.Repo.Migrations.AddSlicingToGroupTournamentsAndPlayers do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:group_tournaments) do
      add(:slice_size, :integer, default: 16, null: false)
      add(:slice_strategy, :string, default: "random", null: false)
    end

    alter table(:group_tournament_players) do
      add(:slice_index, :integer)
      add(:slice_ranking, :integer)
      add(:place, :integer)
    end

    create(index(:group_tournament_players, [:group_tournament_id, :slice_index]))
  end
end
