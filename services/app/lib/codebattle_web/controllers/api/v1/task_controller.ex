defmodule CodebattleWeb.Api.V1.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.{Task}
  alias CodebattleWeb.Api.TaskView

  def index(conn, params) do
    level = Map.get(params, "level", "elementary")
    tasks = Task.list_by_level(level)

    json(conn, %{tasks: TaskView.render_tasks(tasks)})
  end

  def show(conn, %{"id" => id}) do
    task = Task.get!(id)

    if task.visibility == "hidden" do
      json(conn, %{})
    else
      json(conn, TaskView.render_task(task))
    end
  end
end
