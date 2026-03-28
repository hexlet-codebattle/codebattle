defmodule CodebattleWeb.Admin.GroupTaskController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTask.Context

  plug(CodebattleWeb.Plugs.AdminOnly)
  plug(:put_view, CodebattleWeb.Admin.GroupTaskView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :admin})

  def index(conn, _params) do
    render(conn, "index.html",
      group_tasks: Context.list_group_tasks(),
      user: conn.assigns.current_user
    )
  end

  def new(conn, _params) do
    render(conn, "new.html",
      changeset: Context.change_group_task(%Codebattle.GroupTask{}),
      user: conn.assigns.current_user
    )
  end

  def create(conn, %{"group_task" => group_task_params}) do
    case Context.create_group_task(group_task_params) do
      {:ok, group_task} ->
        conn
        |> put_flash(:info, "Group task created successfully.")
        |> redirect(to: Routes.group_task_path(conn, :show, group_task))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset, user: conn.assigns.current_user)
    end
  end

  def show(conn, %{"id" => id}) do
    group_task = Context.get_group_task!(id)

    render(conn, "show.html",
      group_task: group_task,
      token_changeset: token_changeset(%{}),
      solutions: Context.list_solutions(group_task),
      tokens: Context.list_tokens(group_task),
      user: conn.assigns.current_user
    )
  end

  def edit(conn, %{"id" => id}) do
    group_task = Context.get_group_task!(id)

    render(conn, "edit.html",
      group_task: group_task,
      changeset: Context.change_group_task(group_task),
      user: conn.assigns.current_user
    )
  end

  def update(conn, %{"id" => id, "group_task" => group_task_params}) do
    group_task = Context.get_group_task!(id)

    case Context.update_group_task(group_task, group_task_params) do
      {:ok, group_task} ->
        conn
        |> put_flash(:info, "Group task updated successfully.")
        |> redirect(to: Routes.group_task_path(conn, :show, group_task))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html",
          group_task: group_task,
          changeset: changeset,
          user: conn.assigns.current_user
        )
    end
  end

  def delete(conn, %{"id" => id}) do
    id
    |> Context.get_group_task!()
    |> Context.delete_group_task()

    conn
    |> put_flash(:info, "Group task deleted successfully.")
    |> redirect(to: Routes.group_task_path(conn, :index))
  end

  defp token_changeset(attrs) do
    types = %{user_id: :integer}

    {%{}, types}
    |> Ecto.Changeset.cast(attrs, Map.keys(types))
    |> Ecto.Changeset.validate_required([:user_id])
    |> Ecto.Changeset.validate_number(:user_id, greater_than: 0)
  end
end
