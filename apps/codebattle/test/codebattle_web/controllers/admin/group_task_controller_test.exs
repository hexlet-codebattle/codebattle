defmodule CodebattleWeb.Admin.GroupTaskControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.GroupTask.Context
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

  test "admin can generate token for group task user pair", %{conn: conn} do
    admin = insert(:admin)
    user = insert(:user)
    group_task = insert(:group_task)

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> post("/admin/group_tasks/#{group_task.id}/tokens", %{
        "group_task_token" => %{"user_id" => Integer.to_string(user.id)}
      })

    assert redirected_to(conn) == "/admin/group_tasks/#{group_task.id}"

    [token] = Context.list_tokens(group_task)
    assert token.user_id == user.id
    assert token.group_task_id == group_task.id
    assert is_binary(token.token)
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

  test "admin can run checker for selected players and store result", %{conn: conn} do
    admin = insert(:admin)
    user1 = insert(:user)
    user2 = insert(:user)
    group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")

    insert(:group_task_solution, user: user1, group_task: group_task, lang: "python", solution: "print(1)")
    insert(:group_task_solution, user: user1, group_task: group_task, lang: "python", solution: "print(2)")

    insert(:group_task_solution,
      user: user2,
      group_task: group_task,
      lang: "javascript",
      solution: "console.log(2)"
    )

    Process.put(:group_task_runner_response, {:ok, %Req.Response{status: 200, body: %{"winner_id" => user1.id}}})

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> post("/admin/group_tasks/#{group_task.id}/runs", %{
        "group_task_run" => %{"player_ids" => "#{user1.id}, #{user2.id}"}
      })

    assert redirected_to(conn) == "/admin/group_tasks/#{group_task.id}"

    [run] = Context.list_runs(group_task)
    assert run.status == "success"
    assert run.player_ids == Enum.sort([user1.id, user2.id])
    assert run.result == %{"winner_id" => user1.id}

    assert %{
             url: "http://runner.test/api/v1/group_tasks/run",
             opts: opts
           } = Process.get(:group_task_runner_last_request)

    assert opts[:json][:solutions] == [
             %{player_id: user1.id, lang: "python", name: user1.name, solution: "print(2)"},
             %{player_id: user2.id, lang: "javascript", name: user2.name, solution: "console.log(2)"}
           ]
  end

  test "admin can download history and summary json from run", %{conn: conn} do
    admin = insert(:admin)
    group_task = insert(:group_task)

    run =
      insert(:group_task_run,
        group_task: group_task,
        result: %{"history" => [%{"moves" => ["stay"]}], "summary" => %{"scores" => [10]}}
      )

    history_conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get("/admin/group_tasks/#{group_task.id}/runs/#{run.id}/history")

    assert response(history_conn, 200) =~ "\"moves\""
    assert history_conn |> get_resp_header("content-type") |> List.first() =~ "application/json"

    summary_conn =
      build_conn()
      |> Plug.Session.call(
        Plug.Session.init(store: :cookie, key: "_app", encryption_salt: "yadayada", signing_salt: "yadayada")
      )
      |> Plug.Conn.fetch_session()
      |> put_session(:user_id, admin.id)
      |> get("/admin/group_tasks/#{group_task.id}/runs/#{run.id}/summary")

    assert response(summary_conn, 200) =~ "\"scores\""
    assert summary_conn |> get_resp_header("content-disposition") |> List.first() =~ "summary.json"
  end
end
