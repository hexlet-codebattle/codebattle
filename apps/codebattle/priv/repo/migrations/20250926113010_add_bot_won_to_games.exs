defmodule Codebattle.Repo.Migrations.AddBotWonToGames do
  use Ecto.Migration
  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    execute("""
    ALTER TABLE games
    ADD COLUMN bot_won boolean
    GENERATED ALWAYS AS (players @> '[{"is_bot": true, "result": "won"}]') STORED
    """)

    execute("""
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_over_tourn_task_dur_nowin
    ON games (tournament_id, task_id, duration_sec)
    WHERE state = 'game_over' AND bot_won = FALSE
    """)
  end
end
