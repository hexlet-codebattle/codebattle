defmodule Codebattle.Repo.Migrations.AddSolutionsToTasks do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add :solutions, :map, default: %{}, null: false
    end
  end
end
