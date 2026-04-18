defmodule CodebattleWeb.Admin.GroupTaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Repo

  setup do
    Application.put_env(:codebattle, :group_task_runner_http_client, CodebattleWeb.FakeGroupTaskRunnerHttpClient)

    on_exit(fn ->
      Application.delete_env(:codebattle, :group_task_runner_http_client)
      Process.delete(:group_task_runner_last_request)
      Process.delete(:group_task_runner_response)
    end)

    :ok
  end

  test "admin can open group tasks index", %{conn: conn} do
    admin = insert(:admin)
    group_task = insert(:group_task, slug: "arena-1")

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin/group_tasks")

    assert html_response(conn, 200) =~ "Group Tasks"
    assert html_response(conn, 200) =~ group_task.slug
  end

  test "admin can create group task", %{conn: conn} do
    admin = insert(:admin)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> post("/admin/group_tasks", %{
        "group_task" => %{"slug" => "spring-final", "time_to_solve_sec" => "900"}
      })

    assert redirected_to(conn) =~ "/admin/group_tasks/"

    group_task = Repo.get_by!(Codebattle.GroupTask, slug: "spring-final")
    assert group_task.time_to_solve_sec == 900
  end

  test "admin can delete group task solution from show page", %{conn: conn} do
    admin = insert(:admin)
    user = insert(:user)
    group_task = insert(:group_task)
    solution = insert(:group_task_solution, user: user, group_task: group_task)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> delete("/admin/group_tasks/#{group_task.id}/solutions/#{solution.id}")

    assert redirected_to(conn) == "/admin/group_tasks/#{group_task.id}"
    assert Repo.get(Codebattle.GroupTaskSolution, solution.id) == nil
  end

  test "admin can edit group task solution", %{conn: conn} do
    admin = insert(:admin)
    user = insert(:user)
    group_task = insert(:group_task)
    solution = insert(:group_task_solution, user: user, group_task: group_task, lang: "typescript", solution: "old()")

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> patch("/admin/group_tasks/#{group_task.id}/solutions/#{solution.id}", %{
        "group_task_solution" => %{
          "lang" => "python",
          "solution" => "def solution(rounds, participants, you, field, prev_rounds):\n    return \"stay\"\n"
        }
      })

    assert redirected_to(conn) == "/admin/group_tasks/#{group_task.id}"

    solution = Repo.get!(Codebattle.GroupTaskSolution, solution.id)
    assert solution.lang == "python"
    assert solution.solution =~ "return \"stay\""
  end
end
