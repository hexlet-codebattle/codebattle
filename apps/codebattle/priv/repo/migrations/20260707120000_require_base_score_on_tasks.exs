defmodule Codebattle.Repo.Migrations.RequireBaseScoreOnTasks do
  @moduledoc false
  use Ecto.Migration

  def up do
    execute("UPDATE tasks SET base_score = 60 WHERE base_score IS NULL")

    alter table(:tasks) do
      modify(:base_score, :integer, default: 60, null: false)
    end
  end

  def down do
    alter table(:tasks) do
      modify(:base_score, :integer, default: nil, null: true)
    end
  end
end
