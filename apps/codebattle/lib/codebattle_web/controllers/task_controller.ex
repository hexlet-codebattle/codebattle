defmodule CodebattleWeb.TaskController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Task
  alias Codebattle.Task.Stats

  plug(CodebattleWeb.Plugs.RequireAuth)
  plug(:put_view, CodebattleWeb.TaskView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, _params) do
    tasks =
      conn.assigns.current_user
      |> Task.list_visible()
      |> Enum.sort_by(& &1.updated_at, {:desc, NaiveDateTime})

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • List of Tasks.",
      description: "List of Codebattle Tasks.",
      url: Routes.task_path(conn, :index)
    })
    |> render("index.html", %{tasks: tasks})
  end

  def show(conn, %{"id" => id}) do
    task = Task.get!(id)

    if Task.can_see_task?(task, conn.assigns.current_user) do
      task_stats = Stats.get_stats(task.id)

      conn
      |> put_meta_tags(%{
        title: task.name <> " • Hexlet Codebattle • Task.",
        description: String.slice(task.description_en, 0..137),
        url: Routes.task_path(conn, :show, task)
      })
      |> put_gon(
        task: task,
        task_stats: task_stats,
        can_edit_task: Task.can_access_task?(task, conn.assigns.current_user)
      )
      |> render("show.html")
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end

  def delete(conn, %{"id" => id}) do
    task = Task.get!(id)

    if Task.can_delete_task?(task, conn.assigns.current_user) do
      Task.delete(task)

      conn
      |> put_flash(:info, gettext("Task deleted!"))
      |> redirect(to: Routes.task_path(conn, :index))
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end

  def activate(conn, %{"task_id" => id}) do
    task = Task.get!(id)

    if Codebattle.User.admin?(conn.assigns.current_user) do
      Task.change_state(task, "active")

      conn
      |> put_flash(:info, "Task updated successfully.")
      |> redirect(to: Routes.task_path(conn, :index))
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end

  def disable(conn, %{"task_id" => id}) do
    task = Task.get!(id)

    if Codebattle.User.admin?(conn.assigns.current_user) do
      Task.change_state(task, "disabled")

      conn
      |> put_flash(:info, "Task updated successfully.")
      |> redirect(to: Routes.task_path(conn, :index))
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end
end
