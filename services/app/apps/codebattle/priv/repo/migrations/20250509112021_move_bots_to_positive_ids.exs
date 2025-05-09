defmodule Codebattle.Repo.Migrations.MoveBotsToPositiveIds do
  use Ecto.Migration

  def change do
    # First, select all users with negative IDs and save them to a temporary table
    execute("""
    CREATE TEMPORARY TABLE temp_bots AS
    SELECT *
    FROM users
    WHERE id < 0
    """)


    # Delete the old records with negative IDs first
    execute("""
    DELETE FROM users
    WHERE id < 0
    """)

    # Then insert new records with auto-generated IDs and unique names
    execute("""
    INSERT INTO users (
      auth_token,
      inserted_at,
      updated_at,
      github_id,
      name,
      email,
      github_name,
      rating,
      lang,
      password_hash,
      achievements,
      public_id,
      avatar_url,
      sound_settings,
      is_bot,
      rank,
      editor_theme,
      editor_mode,
      clan,
      clan_id,
      category,
      subscription_type,
      discord_id,
      discord_name,
      discord_avatar,
      external_oauth_id,
      timezone,
      firebase_uid,
      collab_logo
    )
    SELECT
      auth_token,
      inserted_at,
      updated_at,
      github_id,
      name,
      email,
      github_name,
      rating,
      lang,
      password_hash,
      achievements,
      public_id,
      avatar_url,
      sound_settings,
      TRUE, -- is_bot set to true
      rank,
      editor_theme,
      editor_mode,
      clan,
      clan_id,
      category,
      subscription_type,
      discord_id,
      discord_name,
      discord_avatar,
      external_oauth_id,
      timezone,
      firebase_uid,
      collab_logo
    FROM temp_bots
    """)

    # Drop temporary table
    execute("DROP TABLE temp_bots")
  end
end
