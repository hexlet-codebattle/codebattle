defmodule CodebattleWeb.RawTaskController do
  use CodebattleWeb, :controller

  alias Codebattle.Task

  def show(conn, %{"id" => id}) do
    # use only visible tasks
    task = Task.get!(id)

    if Task.can_see_task?(task, conn.assigns.current_user) do
      conn
      |> render("show.html", %{
        task: task,
        current_user: conn.assigns.current_user
      })
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end

  def create(conn, %{"task" => task_params}) do
    case Codebattle.TaskForm.create(task_params, conn.assigns.current_user, %{
           "next_state" => "draft"
         }) do
      {:ok, task} ->
        conn
        |> put_flash(:info, "Task created successfully.")
        |> redirect(to: Routes.raw_task_path(conn, :show, task))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def update(conn, %{"id" => id, "task" => task_params}) do
    task = Task.get!(id)

    task_params =
      task_params
      |> Map.put("output_signature", Jason.decode!(task_params["output_signature"] || "{}"))
      |> Map.put("asserts", Jason.decode!(task_params["asserts"] || "[]"))
      |> Map.put("input_signature", Jason.decode!(task_params["input_signature"] || "[]"))

    if Task.can_access_task?(task, conn.assigns.current_user) do
      case Codebattle.TaskForm.update(task, task_params, conn.assigns.current_user) do
        {:ok, task} ->
          conn
          |> put_flash(:info, "Task updated successfully.")
          |> redirect(to: Routes.raw_task_path(conn, :edit, task.id))

        {:error, %Ecto.Changeset{} = changeset} ->
          render(conn, "edit.html", task: task, changeset: changeset)
      end
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end

  def edit(conn, %{"id" => id}) do
    task = Task.get!(id)

    if Task.can_access_task?(task, conn.assigns.current_user) do
      changeset = Codebattle.Task.changeset(task)
      render(conn, "edit.html", task: task, changeset: changeset)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end
end
