defmodule Codebattle.Repo.Migrations.AddPlaybooksGameIdIndex do
  @moduledoc false
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  # Every finished game page and its replay look the playbook up by game_id.
  def up do
    execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS playbooks_game_id_idx ON playbooks (game_id)")
  end

  def down do
    execute("DROP INDEX CONCURRENTLY IF EXISTS playbooks_game_id_idx")
  end
end
