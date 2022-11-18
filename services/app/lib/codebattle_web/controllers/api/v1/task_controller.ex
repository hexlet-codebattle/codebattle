defmodule CodebattleWeb.Api.V1.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.Task
  alias CodebattleWeb.Api.TaskView

  def index(conn, _) do
    tasks =
      conn.assigns.current_user
      |> Task.list_visible()

    json(conn, %{tasks: TaskView.render_tasks(tasks)})
  end

  def show(conn, %{"id" => id}) do
    case Task.get_task_by_id_for_user(conn.assigns.current_user, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "NOT_FOUND"})

      task ->
        json(conn, TaskView.render_task(task))
    end
  end
end
