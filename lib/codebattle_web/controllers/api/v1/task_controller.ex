defmodule CodebattleWeb.Api.V1.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.Task
  alias CodebattleWeb.Api.TaskView

  def index(conn, _) do
    tasks = Task.list_visible(conn.assigns.current_user)

    json(conn, %{tasks: TaskView.render_tasks(tasks)})
  end

  def show(conn, %{"id" => id}) do
    case Task.get_task_by_id_for_user(conn.assigns.current_user, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "NOT_FOUND"})

      task ->
        json(conn, %{task: task})
    end
  end

  def update(conn, %{"id" => id, "task" => task_params}) do
    task = Task.get!(id)

    if Task.can_access_task?(task, conn.assigns.current_user) do
      case Task.update(task, task_params) do
        {:ok, task} ->
          json(conn, %{task: task})

        {:error, %Ecto.Changeset{} = changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{error: "failure", changeset: changeset})
      end
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
    end
  end

  def stats(conn, %{"id" => id}) do
    task = Task.get!(id)

    if Task.can_see_task?(task, conn.assigns.current_user) do
      stats = Codebattle.Task.Stats.get_stats(task.id)
      json(conn, %{stats: stats})
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
    end
  end
end
