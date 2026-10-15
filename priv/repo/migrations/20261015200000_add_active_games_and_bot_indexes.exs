defmodule Codebattle.Repo.Migrations.AddActiveGamesAndBotIndexes do
  @moduledoc false
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  # Every page of a signed-in user looks up their waiting/playing game (Game.Context.get_active_game_id/2);
  # the state = 'playing' index can't serve both states, so this lookup scanned all their games.
  def up do
    execute("""
    CREATE INDEX CONCURRENTLY IF NOT EXISTS games_active_player_ids_idx
    ON games USING gin (player_ids)
    WHERE state IN ('waiting_opponent', 'playing')
    """)

    # Bot.Context finds the one Codebot (`WHERE is_bot ORDER BY id LIMIT 1`) for every bot game.
    execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS users_bot_id_idx ON users (id) WHERE is_bot")
  end

  def down do
    execute("DROP INDEX CONCURRENTLY IF EXISTS games_active_player_ids_idx")
    execute("DROP INDEX CONCURRENTLY IF EXISTS users_bot_id_idx")
  end
end
