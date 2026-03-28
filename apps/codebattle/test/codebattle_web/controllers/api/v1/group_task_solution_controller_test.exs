defmodule CodebattleWeb.Api.V1.GroupTaskSolutionControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.GroupTask.Context
  alias Codebattle.Repo

  setup do
    FunWithFlags.disable(:group_tasks_api)

    on_exit(fn ->
      FunWithFlags.disable(:group_tasks_api)
    end)

    :ok
  end

  test "returns forbidden when feature flag is disabled", %{conn: conn} do
    response =
      conn
      |> put_req_header("authorization", "Bearer some-token")
      |> post("/api/v1/group_task_solutions", %{"solution" => "print(1)", "lang" => "python"})
      |> json_response(403)

    assert response["error"] == "group_tasks_api_disabled"
  end

  test "returns unauthorized for invalid token", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    response =
      conn
      |> put_req_header("authorization", "Bearer missing-token")
      |> post("/api/v1/group_task_solutions", %{"solution" => "print(1)", "lang" => "python"})
      |> json_response(401)

    assert response["error"] == "unauthorized"
  end

  test "creates solution from bearer token", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    group_task = insert(:group_task)
    {:ok, token} = Context.create_or_rotate_token(group_task, user.id)

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => "def solution():\n    return 42\n",
        "lang" => "Python"
      })
      |> json_response(201)

    assert response["group_task_solution"]["group_task_id"] == group_task.id
    assert response["group_task_solution"]["user_id"] == user.id
    assert response["group_task_solution"]["lang"] == "python"

    [solution] = Context.list_solutions(group_task)
    assert solution.user_id == user.id
    assert solution.solution =~ "return 42"
  end

  test "returns validation errors for empty solution payload", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    group_task = insert(:group_task)
    {:ok, token} = Context.create_or_rotate_token(group_task, user.id)

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{"solution" => "   ", "lang" => ""})
      |> json_response(422)

    assert response["errors"]["solution"] == ["can't be blank"]
    assert response["errors"]["lang"] == ["can't be blank"]
    assert Repo.aggregate(Codebattle.GroupTaskSolution, :count, :id) == 0
  end
end
