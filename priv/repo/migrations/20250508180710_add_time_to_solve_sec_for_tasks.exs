defmodule Codebattle.Repo.Migrations.AddTimeToSolveSecForTasks do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add :time_to_solve_sec, :integer
    end
  end
end
