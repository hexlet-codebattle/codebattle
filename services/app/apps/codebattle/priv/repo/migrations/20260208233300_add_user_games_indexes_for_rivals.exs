defmodule Codebattle.Repo.Migrations.AddUserGamesIndexesForRivals do
  use Ecto.Migration
  @disable_ddl_transaction true
  @disable_migration_lock true

  def up do
    execute("""
    CREATE INDEX CONCURRENTLY IF NOT EXISTS user_games_user_id_result_game_id_idx
    ON user_games (user_id, result, game_id)
    """)

    execute("""
    CREATE INDEX CONCURRENTLY IF NOT EXISTS user_games_game_id_result_user_id_idx
    ON user_games (game_id, result, user_id)
    """)
  end

  def down do
    execute("DROP INDEX CONCURRENTLY IF EXISTS user_games_user_id_result_game_id_idx")
    execute("DROP INDEX CONCURRENTLY IF EXISTS user_games_game_id_result_user_id_idx")
  end
end
