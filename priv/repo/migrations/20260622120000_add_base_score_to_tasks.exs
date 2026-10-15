defmodule Codebattle.Repo.Migrations.AddBaseScoreToTasks do
  @moduledoc false
  use Ecto.Migration

  # Static per-task base score. Replaces the old per-round 25th-percentile-of-durations
  # base score, which drifted between rounds as the pool of finishers changed (in playoff
  # rounds slow solvers don't finish, so the percentile shifted and a task was worth a
  # different amount in R6 than in R1). Backfill existing tasks by level so already-running
  # tournaments keep scoring.
  def up do
    alter table(:tasks) do
      add(:base_score, :integer)
    end

    flush()

    execute("""
    UPDATE tasks
    SET base_score = CASE level
      WHEN 'elementary' THEN 100
      WHEN 'easy' THEN 200
      WHEN 'medium' THEN 300
      WHEN 'hard' THEN 400
      ELSE 100
    END
    WHERE base_score IS NULL
    """)
  end

  def down do
    alter table(:tasks) do
      remove(:base_score)
    end
  end
end
