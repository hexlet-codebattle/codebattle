defmodule Codebattle.Repo.Migrations.SetTaskTimingByLevel do
  @moduledoc false
  use Ecto.Migration

  # Mirrors Codebattle.Task's level defaults at the time of writing (a migration must not
  # depend on app code that may change later).
  @timing [
    {"elementary", 60, 120},
    {"easy", 90, 180},
    {"medium", 150, 300},
    {"hard", 240, 480}
  ]

  # Only tasks still on the old global defaults (60 points, 180s) move to their level's
  # timing; a task with hand-tuned values keeps them.
  def up do
    Enum.each(@timing, fn {level, base_score, time_to_solve_sec} ->
      execute("""
      UPDATE tasks
      SET base_score = #{base_score}, time_to_solve_sec = #{time_to_solve_sec}
      WHERE level = '#{level}' AND base_score = 60 AND time_to_solve_sec = 180
      """)
    end)
  end

  def down do
    Enum.each(@timing, fn {level, base_score, time_to_solve_sec} ->
      execute("""
      UPDATE tasks
      SET base_score = 60, time_to_solve_sec = 180
      WHERE level = '#{level}' AND base_score = #{base_score} AND time_to_solve_sec = #{time_to_solve_sec}
      """)
    end)
  end
end
