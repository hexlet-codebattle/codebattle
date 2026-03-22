defmodule Codebattle.Repo.Migrations.AddTimeoutModeToTournaments do
  use Ecto.Migration

  def up do
    alter table(:tournaments) do
      add :timeout_mode, :string, default: "per_task", null: false
    end

    execute("""
    UPDATE tournaments
    SET timeout_mode = CASE
      WHEN round_timeout_seconds IS NULL THEN 'per_task'
      ELSE 'per_round'
    END
    """)
  end

  def down do
    alter table(:tournaments) do
      remove :timeout_mode
    end
  end
end
