defmodule CodebattleWeb.TaskPackController do
  use CodebattleWeb, :controller

  alias Codebattle.TaskPack
  alias Codebattle.User
  alias CodebattleWeb.Frontend
  alias CodebattleWeb.Frontend.Present

  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  plug(CodebattleWeb.Plugs.RequireAuth)

  def index(conn, _params) do
    task_packs = TaskPack.list_visible(conn.assigns.current_user)

    conn =
      put_meta_tags(conn, %{
        title: "Hexlet Codebattle • Task Packs.",
        description: "List of Codebattle Task Packs.",
        url: Routes.task_pack_path(conn, :index)
      })

    conn
    |> Frontend.put_layout()
    |> render_inertia("TaskPackIndex", %{"task_packs" => Present.task_packs(task_packs)})
  end

  def new(conn, _params) do
    conn
    |> put_meta_tags(%{
      title: "Hexlet Codebattle • TaskPack",
      description: "Create your own task pack",
      url: Routes.task_pack_path(conn, :new)
    })
    |> render_form(nil)
  end

  def show(conn, %{"id" => id}) do
    # use only visible tasks
    task_pack = TaskPack.get(id)

    cond do
      is_nil(task_pack) ->
        conn
        |> put_flash(:danger, gettext("Task Pack not found"))
        |> redirect(to: Routes.task_pack_path(conn, :index))

      TaskPack.can_see_task_pack?(task_pack, conn.assigns.current_user) ->
        conn =
          put_meta_tags(conn, %{
            title: task_pack.name <> " • Hexlet Codebattle • TaskPack.",
            description: "Hexlet Codebattle • TaskPack",
            url: Routes.task_pack_path(conn, :show, task_pack)
          })

        tasks = TaskPack.get_tasks(task_pack)

        conn
        |> Frontend.put_layout()
        |> render_inertia("TaskPackShow", %{
          "task_pack" => Present.task_pack(task_pack),
          "tasks" => Present.tasks(tasks),
          "can_edit" => TaskPack.can_access_task_pack?(task_pack, conn.assigns.current_user)
        })

      true ->
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
        render_form_errors(conn, changeset, Routes.task_pack_path(conn, :new))
    end
  end

  def update(conn, %{"id" => id, "task_pack" => task_pack_params}) do
    task_pack = TaskPack.get!(id)

    if TaskPack.can_access_task_pack?(task_pack, conn.assigns.current_user) do
      save_task_pack(conn, task_pack, task_pack_params)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task not found")})
    end
  end

  def edit(conn, %{"id" => id}) do
    task_pack = TaskPack.get(id)

    cond do
      is_nil(task_pack) ->
        conn
        |> put_flash(:danger, gettext("Task Pack not found"))
        |> redirect(to: Routes.task_pack_path(conn, :index))

      TaskPack.can_access_task_pack?(task_pack, conn.assigns.current_user) ->
        render_form(conn, task_pack)

      true ->
        conn
        |> put_status(:not_found)
        |> put_view(CodebattleWeb.ErrorView)
        |> render("404.html", %{msg: gettext("TaskPack not found")})
    end
  end

  def delete(conn, %{"id" => id}) do
    task_pack = TaskPack.get!(id)

    if TaskPack.can_access_task_pack?(task_pack, conn.assigns.current_user) do
      TaskPack.delete(task_pack)

      conn
      |> put_flash(:info, gettext("Task pack deleted!"))
      |> redirect(to: Routes.task_pack_path(conn, :index))
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Task pack not found")})
    end
  end

  def activate(conn, %{"task_pack_id" => id}) do
    task_pack = TaskPack.get!(id)

    if User.admin?(conn.assigns.current_user) do
      TaskPack.change_state(task_pack, "active")

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

    if User.admin?(conn.assigns.current_user) do
      TaskPack.change_state(task_pack, "disabled")

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

  defp save_task_pack(conn, task_pack, task_pack_params) do
    case Codebattle.TaskPackForm.update(task_pack, task_pack_params, conn.assigns.current_user) do
      {:ok, task_pack} ->
        conn
        |> put_flash(:info, "TaskPack updated successfully.")
        |> redirect(to: Routes.task_pack_path(conn, :edit, task_pack.id))

      {:error, %Ecto.Changeset{} = changeset} ->
        render_form_errors(conn, changeset, Routes.task_pack_path(conn, :edit, task_pack.id))
    end
  end

  # Inertia convention: errors travel with a redirect back to the form.
  defp render_form_errors(conn, changeset, form_path) do
    conn
    |> assign_errors(changeset)
    |> redirect(to: form_path)
  end

  # One Inertia page for both new (task_pack = nil) and edit.
  defp render_form(conn, task_pack) do
    conn
    |> Frontend.put_layout()
    |> render_inertia("TaskPackForm", %{
      "task_pack" => task_pack && Present.task_pack(task_pack),
      "visibility_types" => TaskPack.visibility_types()
    })
  end
end
