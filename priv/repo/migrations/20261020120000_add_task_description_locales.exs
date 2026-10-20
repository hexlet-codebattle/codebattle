defmodule Codebattle.Repo.Migrations.AddTaskDescriptionLocales do
  @moduledoc false
  use Ecto.Migration

  def change do
    for task_table <- [:tasks, :css_tasks, :sql_tasks] do
      alter table(task_table) do
        add :description_es, :text
        add :description_zh, :text
      end
    end
  end
end
