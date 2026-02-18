defmodule Codebattle.Repo.Migrations.AddTournamentUserResults do
  use Ecto.Migration

  def change do
    create table(:tournament_user_results) do
      add(:avg_result_percent, :decimal)
      add(:is_cheater, :boolean, default: false)
      add(:clan_id, :bigint)
      add(:place, :integer, default: 0)
      add(:points, :integer, default: 0)
      add(:score, :integer, default: 0)
      add(:total_time, :integer, default: 0)
      add(:tournament_id, references(:tournaments, on_delete: :delete_all))
      add(:user_id, references(:users, on_delete: :delete_all))
      add(:user_name, :string)
      add(:wins_count, :integer, default: 0)
      add(:games_count, :integer, default: 0)

      timestamps(updated_at: false)
    end

    create(unique_index(:tournament_user_results, [:tournament_id, :user_id]))
    create(index(:tournament_user_results, [:user_id]))
  end
end
