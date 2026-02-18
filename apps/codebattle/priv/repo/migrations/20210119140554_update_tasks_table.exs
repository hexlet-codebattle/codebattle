defmodule Codebattle.Repo.Migrations.UpdateTasksTable do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add :description_ru, :text
      add :description_en, :text
    end

    rename table(:tasks), :description, to: :examples
  end
end
