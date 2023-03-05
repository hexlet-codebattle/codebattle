defmodule Codebattle.Repo.Migrations.ImproveTournaments do
  use Ecto.Migration

  def change do
    alter table(:tournaments) do
      add(:matches, :jsonb)
      add(:players, :jsonb)
      add(:stages, :jsonb)
      add(:task_strategy, :string)
    end

    rename(table(:tournaments), :players_count, to: :players_limit)
    rename(table(:tournaments), :difficulty, to: :level)
    rename(table(:tournaments), :step, to: :current_round)
  end
end
