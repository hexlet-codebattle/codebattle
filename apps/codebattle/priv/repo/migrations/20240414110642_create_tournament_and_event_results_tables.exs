defmodule Codebattle.Repo.Migrations.CreateTournamentAndEventResultsTables do
  use Ecto.Migration
  def change do
    create table(:tournament_results) do
      add :tournament_id, :integer
      add :game_id, :integer
      add :user_id, :integer
      add :user_name, :text
      add :clan_id, :integer
      add :task_id, :integer
      add :score, :integer
      add :level, :text
      add :duration_sec, :integer
      add :result_percent, :decimal
    end

    create table(:event_results) do
      add :event_id, :integer
      add :user_id, :integer
      add :user_name, :text
      add :clan_id, :integer
      add :score, :integer
    end

    create unique_index(:tournament_results, [:tournament_id, :user_id, :task_id])
    create unique_index(:event_results, [:event_id, :user_id])
  end
end
