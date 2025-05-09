defmodule Codebattle.Repo.Migrations.MoveBotsToPositiveIds do
  use Ecto.Migration

  def change do
    execute("""
    WITH max_id AS (
      SELECT MAX(id) AS max_id
      FROM users
    )
    UPDATE users
    SET id = max_id.max_id + 1 + (id * -1), is_bot = true
    FROM max_id
    WHERE id < 0
    """)
  end
end
