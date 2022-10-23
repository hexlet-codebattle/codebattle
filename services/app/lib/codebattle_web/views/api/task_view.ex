defmodule CodebattleWeb.Api.TaskView do
  use CodebattleWeb, :view

  def render_task(task) do
    %{
      id: task.id,
      name: task.name,
      level: task.level,
      descriptions: render_descriptions(task),
      tags: task.tags
    }
  end

  def render_tasks(tasks) do
    tasks |> Enum.map(&render_task/1)
  end

  defp render_descriptions(task) do
    %{ru: task.description_ru, en: task.description_en}
  end
end
