defmodule Codebattle.Repo.Migrations.UpdateTasksTable do
  use Ecto.Migration

  def change do
    alter table(:tasks) do
      add :description_ru, :text, default: "Описание отсутствует."
      add :description_en, :text, default: "No description available."
    end

    rename table(:tasks), :description, to: :examples
  end
end
