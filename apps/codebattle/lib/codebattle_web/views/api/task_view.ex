defmodule CodebattleWeb.Api.TaskView do
  use CodebattleWeb, :view

  def render_task(task) do
    %{
      id: task.id,
      name: task.name,
      description_en: task.description_en,
      description_ru: task.description_ru,
      level: task.level,
      origin: task.origin,
      creator_id: task.creator_id,
      tags: task.tags
    }
  end

  def render_tasks(tasks) do
    Enum.map(tasks, &render_task/1)
  end
end
