defmodule Codebattle.Repo.Migrations.ImproveTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:intended_player_ids, {:array, :integer})
      add(:matches, :jsonb)
      add(:players, :jsonb)
      add(:players_limit, :integer)
      add(:stages, :jsonb)
      add(:task_strategy, :string)
    end

    rename(table(:tournaments), :difficulty, to: :level)
    rename(table(:tournaments), :step, to: :current_round)
  end
end
