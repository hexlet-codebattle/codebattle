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
      solutions: Context.list_solutions(group_task, limit: 20),
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

  def download_run_part(conn, %{"id" => group_task_id, "run_id" => run_id, "part" => part}) do
    group_task = Context.get_group_task!(group_task_id)
    run = Context.get_run!(run_id)

    if run.group_task_id == group_task.id and part in ["history", "summary", "viewer"] do
      send_run_part(conn, group_task, run, part)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Group task run part not found")})
    end
  end

  def edit_solution(conn, %{"id" => group_task_id, "solution_id" => solution_id}) do
    group_task = Context.get_group_task!(group_task_id)
    solution = Context.get_solution!(solution_id)

    if solution.group_task_id == group_task.id do
      render(conn, "edit_solution.html",
        group_task: group_task,
        solution: solution,
        changeset: Context.change_solution(solution),
        user: conn.assigns.current_user
      )
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Group task solution not found")})
    end
  end

  def update_solution(conn, %{
        "id" => group_task_id,
        "solution_id" => solution_id,
        "group_task_solution" => solution_params
      }) do
    group_task = Context.get_group_task!(group_task_id)
    solution = Context.get_solution!(solution_id)

    if solution.group_task_id == group_task.id do
      case Context.update_solution(solution, solution_params) do
        {:ok, _solution} ->
          conn
          |> put_flash(:info, "Group task solution updated successfully.")
          |> redirect(to: Routes.group_task_path(conn, :show, group_task))

        {:error, %Ecto.Changeset{} = changeset} ->
          render(conn, "edit_solution.html",
            group_task: group_task,
            solution: solution,
            changeset: changeset,
            user: conn.assigns.current_user
          )
      end
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Group task solution not found")})
    end
  end

  def delete_solution(conn, %{"id" => group_task_id, "solution_id" => solution_id}) do
    group_task = Context.get_group_task!(group_task_id)
    solution = Context.get_solution!(solution_id)

    if solution.group_task_id == group_task.id do
      Context.delete_solution(solution)

      conn
      |> put_flash(:info, "Group task solution deleted successfully.")
      |> redirect(to: Routes.group_task_path(conn, :show, group_task))
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html", %{msg: gettext("Group task solution not found")})
    end
  end

  defp send_run_part(conn, group_task, run, "viewer") do
    html = Map.get(run.result, "viewer_html") || Map.get(run.result, :viewer_html)

    if is_binary(html) and html != "" do
      conn
      |> put_resp_content_type("text/html")
      |> put_resp_header("content-disposition", ~s(inline; filename="#{group_task.slug}_run_#{run.id}_viewer.html"))
      |> send_resp(200, html)
    else
      render_group_task_run_part_not_found(conn)
    end
  end

  defp send_run_part(conn, group_task, run, part) do
    data = Map.get(run.result, part, %{})

    conn
    |> put_resp_content_type("application/json")
    |> put_resp_header(
      "content-disposition",
      ~s(attachment; filename="#{group_task.slug}_run_#{run.id}_#{part}.json")
    )
    |> send_resp(200, Jason.encode_to_iodata!(data, pretty: true))
  end

  defp render_group_task_run_part_not_found(conn) do
    conn
    |> put_status(:not_found)
    |> put_view(CodebattleWeb.ErrorView)
    |> render("404.html", %{msg: gettext("Group task run part not found")})
  end
end
