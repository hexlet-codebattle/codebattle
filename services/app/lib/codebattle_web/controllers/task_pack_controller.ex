defmodule CodebattleWeb.TaskPackController do
  use CodebattleWeb, :controller

  plug(CodebattleWeb.Plugs.RequireAuth)

  alias Codebattle.TaskPack

  def index(conn, _params) do
    task_packs = TaskPack.list_visible(conn.assigns.current_user)

    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • Task Packs.",
      description: "List of Codebattle Task Packs.",
      url: Routes.task_pack_path(conn, :index)
    })
    |> render("index.html", %{task_packs: task_packs})
  end

  def new(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • TaskPack",
      description: "Create your own task pack",
      url: Routes.task_pack_path(conn, :new)
    })
    |> render("new.html", changeset: Codebattle.TaskPack.changeset(%Codebattle.TaskPack{}))
  end

  def show(conn, %{"id" => id}) do
    # use only visible tasks
    task_pack = TaskPack.get!(id)

    if TaskPack.can_see_task_pack?(task_pack, conn.assigns.current_user) do
      conn
      |> put_meta_tags(%{
        title: task_pack.name <> " • Hexlet Codebattle • TaskPack.",
        description: "Hexlet Codebattle • TaskPack",
        url: Routes.task_pack_path(conn, :show, task_pack)
      })
      |> render("show.html", %{
        task_pack: task_pack,
        current_user: conn.assigns.current_user
      })
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task Pack not found")})
    end
  end

  def create(conn, %{"task_pack" => task_pack_params}) do
    case Codebattle.TaskPackForm.create(task_pack_params, conn.assigns.current_user) do
      {:ok, task} ->
        conn
        |> put_flash(:info, "TaskPack created successfully.")
        |> redirect(to: Routes.task_pack_path(conn, :show, task))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def update(conn, %{"id" => id, "task_pack" => task_pack_params}) do
    task_pack = TaskPack.get!(id)

    if TaskPack.can_access_task_pack?(task_pack, conn.assigns.current_user) do
      case Codebattle.TaskPackForm.update(task_pack, task_pack_params, conn.assigns.current_user) do
        {:ok, task_pack} ->
          conn
          |> put_flash(:info, "TaskPack updated successfully.")
          |> redirect(to: Routes.task_pack_path(conn, :edit, task_pack.id))

        {:error, %Ecto.Changeset{} = changeset} ->
          render(conn, "edit.html", task_pack: task_pack, changeset: changeset)
      end
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end

  def edit(conn, %{"id" => id}) do
    task_pack = TaskPack.get!(id)

    if TaskPack.can_access_task_pack?(task_pack, conn.assigns.current_user) do
      changeset = Codebattle.TaskPack.changeset(task_pack)
      render(conn, "edit.html", task_pack: task_pack, changeset: changeset)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("TaskPack not found")})
    end
  end

  def activate(conn, %{"task_pack_id" => id}) do
    task_pack = TaskPack.get!(id)

    if Codebattle.User.is_admin?(conn.assigns.current_user) do
      Codebattle.TaskPack.change_state(task_pack, "active")

      conn
      |> put_flash(:info, "TaskPack updated successfully.")
      |> redirect(to: Routes.task_pack_path(conn, :index))
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("TaskPack not found")})
    end
  end

  def disable(conn, %{"task_pack_id" => id}) do
    task_pack = TaskPack.get!(id)

    if Codebattle.User.is_admin?(conn.assigns.current_user) do
      Codebattle.TaskPack.change_state(task_pack, "disabled")

      conn
      |> put_flash(:info, "TaskPack updated successfully.")
      |> redirect(to: Routes.task_pack_path(conn, :index))
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("TaskPack not found")})
    end
  end
end
