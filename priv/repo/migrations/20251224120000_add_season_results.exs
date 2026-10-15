defmodule Codebattle.Repo.Migrations.AddSeasonResults do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:season_results) do
      add(:season_id, references(:seasons, on_delete: :delete_all), null: false)
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:user_name, :string)
      add(:user_lang, :string)
      add(:clan_id, :bigint)
      add(:clan_name, :string)
      add(:place, :integer, default: 0)
      add(:total_points, :integer, default: 0)
      add(:total_score, :integer, default: 0)
      add(:tournaments_count, :integer, default: 0)
      add(:total_games_count, :integer, default: 0)
      add(:total_wins_count, :integer, default: 0)
      add(:avg_place, :decimal)
      add(:best_place, :integer)
      add(:total_time, :integer, default: 0)

      timestamps(updated_at: false)
    end

    create(unique_index(:season_results, [:season_id, :user_id]))
    create(index(:season_results, [:user_id]))
  end
end
