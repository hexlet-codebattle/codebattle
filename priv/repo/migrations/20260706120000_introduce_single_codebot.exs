defmodule Codebattle.Repo.Migrations.IntroduceSingleCodebot do
  @moduledoc """
  Collapses every bot user into a single canonical "Codebot" and makes
  `tasks.time_to_solve_sec` non-null (default 3 minutes).

  Bots no longer replay recorded playbooks — the single Codebot solves every
  task from `task.solutions["python"]`. To keep game history/stats intact, all
  references to old bot users are repointed to Codebot (or dropped where they are
  derived bot artifacts), and the old bot users are deleted.
  """
  use Ecto.Migration

  @codebot_name "Codebot"
  @codebot_email "codebot@codebattle.io"

  def up do
    # 1. tasks.time_to_solve_sec => NOT NULL, default 180s (3 minutes).
    execute("UPDATE tasks SET time_to_solve_sec = 180 WHERE time_to_solve_sec IS NULL")

    alter table(:tasks) do
      modify(:time_to_solve_sec, :integer, null: false, default: 180)
    end

    # 2. Ensure the single canonical Codebot user exists (name is unique).
    execute("""
    INSERT INTO users (name, email, is_bot, rating, lang, inserted_at, updated_at)
    VALUES ('#{@codebot_name}', '#{@codebot_email}', TRUE, 1200, 'python', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING
    """)

    # 3. Repoint everything from the old bots to Codebot, then delete the old bots.
    execute("""
    DO $$
    DECLARE
      codebot_id bigint;
      old_ids bigint[];
      fk record;
    BEGIN
      SELECT id INTO codebot_id
      FROM users
      WHERE name = '#{@codebot_name}' AND is_bot
      LIMIT 1;

      IF codebot_id IS NULL THEN
        RETURN;
      END IF;

      SELECT array_agg(id) INTO old_ids
      FROM users
      WHERE is_bot AND id <> codebot_id;

      IF old_ids IS NULL THEN
        RETURN;
      END IF;

      -- Preserve game participation & stats (no unique/FK constraints here).
      UPDATE user_games SET user_id = codebot_id WHERE user_id = ANY(old_ids);
      UPDATE playbooks SET winner_id = codebot_id WHERE winner_id = ANY(old_ids);

      -- Denormalized game snapshots: the id array and the embedded players JSON.
      UPDATE games
      SET player_ids = (
        SELECT array_agg(CASE WHEN pid = ANY(old_ids) THEN codebot_id ELSE pid END)
        FROM unnest(player_ids) AS pid
      )
      WHERE player_ids::bigint[] && old_ids;

      UPDATE games
      SET players = (
        SELECT jsonb_agg(
                 CASE
                   WHEN (elem->>'id')::bigint = ANY(old_ids)
                   THEN jsonb_set(elem, '{id}', to_jsonb(codebot_id))
                   ELSE elem
                 END
                 ORDER BY ord
               )
        FROM jsonb_array_elements(players) WITH ORDINALITY AS t(elem, ord)
      )
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(players) AS e
        WHERE (e->>'id')::bigint = ANY(old_ids)
      );

      -- Everything else referencing a user via a real foreign key is a derived
      -- bot artifact (tournament/season results, reports, events, ...). Some of
      -- these have unique (scope, user_id) constraints that repointing would
      -- violate, so we drop the old bot rows instead.
      FOR fk IN
        SELECT DISTINCT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'users'
          AND ccu.column_name = 'id'
      LOOP
        EXECUTE format('DELETE FROM %I WHERE %I = ANY($1)', fk.table_name, fk.column_name)
        USING old_ids;
      END LOOP;

      DELETE FROM users WHERE id = ANY(old_ids);
    END $$;
    """)
  end

  def down do
    alter table(:tasks) do
      modify(:time_to_solve_sec, :integer, null: true, default: nil)
    end
  end
end
