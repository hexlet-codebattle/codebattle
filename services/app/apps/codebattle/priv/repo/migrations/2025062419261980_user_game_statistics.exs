defmodule Codebattle.Repo.Migrations.AddUserGameStatistics do
  use Ecto.Migration

  def change do
    create table(:user_game_statistics) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :total_games, :integer, default: 0
      add :total_wins, :integer, default: 0
      add :total_losses, :integer, default: 0
      add :versus_bot_games, :integer, default: 0
      add :versus_human_games, :integer, default: 0
      timestamps(updated_at: :updated_at)
    end

    create unique_index(:user_game_statistics, [:user_id])
  end
end