defmodule Codebattle.Repo.Migrations.AddUniqueFirebaseUidIndex do
  @moduledoc false
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def up do
    execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT firebase_uid
        FROM users
        WHERE firebase_uid IS NOT NULL AND firebase_uid <> ''
        GROUP BY firebase_uid
        HAVING COUNT(*) > 1
      ) THEN
        RAISE EXCEPTION 'Cannot enforce unique Firebase identities: duplicate users.firebase_uid values exist';
      END IF;
    END
    $$
    """)

    execute("""
    CREATE UNIQUE INDEX CONCURRENTLY users_firebase_uid_index
    ON users (firebase_uid)
    WHERE firebase_uid IS NOT NULL AND firebase_uid <> ''
    """)
  end

  def down do
    execute("DROP INDEX CONCURRENTLY IF EXISTS users_firebase_uid_index")
  end
end
