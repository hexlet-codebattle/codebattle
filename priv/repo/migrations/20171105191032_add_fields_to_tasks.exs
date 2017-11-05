defmodule Codebattle.Repo.Migrations.AddFieldsToTasks do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add :name, :text
      add :level, :text
      add :asserts, :text
      modify :description, :text
    end

    create unique_index(:tasks, :name)
  end
end
