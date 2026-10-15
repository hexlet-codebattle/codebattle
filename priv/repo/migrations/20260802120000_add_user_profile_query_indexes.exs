defmodule Codebattle.Repo.Migrations.AddUserProfileQueryIndexes do
  @moduledoc false
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def up do
    execute("""
    CREATE INDEX CONCURRENTLY IF NOT EXISTS user_games_user_id_result_lang_stats_idx
    ON user_games (user_id, result, lang)
    WHERE result IN ('won', 'lost', 'gave_up')
    """)

    execute("""
    CREATE INDEX CONCURRENTLY IF NOT EXISTS games_playing_player_ids_idx
    ON games USING gin (player_ids)
    WHERE state = 'playing'
    """)
  end

  def down do
    execute("DROP INDEX CONCURRENTLY IF EXISTS user_games_user_id_result_lang_stats_idx")
    execute("DROP INDEX CONCURRENTLY IF EXISTS games_playing_player_ids_idx")
  end
end
