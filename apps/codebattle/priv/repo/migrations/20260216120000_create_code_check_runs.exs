defmodule Codebattle.Repo.Migrations.CreateCodeCheckRuns do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:code_check_runs) do
      add(:user_id, :integer)
      add(:game_id, :integer)
      add(:tournament_id, :integer)
      add(:lang, :string, null: false)
      add(:started_at, :utc_datetime_usec, null: false)
      add(:duration_ms, :integer, null: false)
      add(:result, :string, null: false)
    end

    execute(
      """
      CREATE INDEX code_check_runs_started_at_idx
      ON code_check_runs (started_at DESC)
      INCLUDE (lang, result, duration_ms)
      """,
      "DROP INDEX IF EXISTS code_check_runs_started_at_idx"
    )
  end
end
