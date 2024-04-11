defmodule CodebattleWeb.TaskController do
  use CodebattleWeb, :controller

  alias Codebattle.Task
  alias Codebattle.Game
  alias CodebattleWeb.Api.GameView

  import PhoenixGon.Controller

  def index(conn, _params) do
    tasks = Task.list_visible(conn.assigns.current_user)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • List of Tasks.",
      description: "List of Codebattle Tasks.",
      url: Routes.task_path(conn, :index)
    })
    |> render("index.html", %{tasks: tasks})
  end

  def new(conn, _params) do
    user_id = conn.assigns.current_user.id
    task = Task.create_empty(user_id)
    game = Game.Context.create_empty_game(user_id, task)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Task",
      description: "Create your own task",
      url: Routes.task_path(conn, :new)
    })
    |> put_gon(
      task: task,
      game: GameView.render_game(game, nil)
    )
    |> render("new.html")
  end

  def show(conn, %{"id" => id}) do
    # use only visible tasks
    task = Task.get!(id)

    if Task.can_see_task?(task, conn.assigns.current_user) do
      # played_count = Task.get_played_count(id)
      game =
        Game.Context.create_empty_game(
          conn.assigns.current_user.id,
          task
        )
        |> GameView.render_game(nil)

      conn
      |> put_meta_tags(%{
        title: task.name <> " • Hexlet Codebattle • Task.",
        description: String.slice(task.description_en, 0..137),
        url: Routes.task_path(conn, :show, task)
      })
      |> put_gon(task: task, game: game)
      |> render("new.html")
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
        |> redirect(to: Routes.task_path(conn, :show, task))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def update(conn, %{"id" => id, "task" => task_params}) do
    task = Task.get!(id)

    if Task.can_access_task?(task, conn.assigns.current_user) do
      case Codebattle.TaskForm.update(task, task_params, conn.assigns.current_user) do
        {:ok, task} ->
          conn
          |> put_flash(:info, "Task updated successfully.")
          |> redirect(to: Routes.task_path(conn, :edit, task.id))

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
      Codebattle.Task.change_state(task, "active")

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
      Codebattle.Task.change_state(task, "disabled")

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
