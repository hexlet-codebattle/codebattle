defmodule CodebattleWeb.Api.V1.GroupTaskSolutionControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.Repo

  setup do
    Application.put_env(:codebattle, :group_task_runner_http_client, CodebattleWeb.FakeGroupTaskRunnerHttpClient)

    FunWithFlags.disable(:group_tasks_api)

    on_exit(fn ->
      Application.delete_env(:codebattle, :group_task_runner_http_client)
      Application.delete_env(:codebattle, :group_task_runner_response)
      Process.delete(:group_task_runner_last_request)
      Process.delete(:group_task_runner_response)
      FunWithFlags.disable(:group_tasks_api)
    end)

    :ok
  end

  test "returns forbidden when feature flag is disabled", %{conn: conn} do
    response =
      conn
      |> put_req_header("authorization", "Bearer some-token")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => Base.encode64("print(1)"),
        "lang" => "python"
      })
      |> json_response(403)

    assert response["error"] == "group_tasks_api_disabled"
  end

  test "returns unauthorized for invalid token", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    response =
      conn
      |> put_req_header("authorization", "Bearer missing-token")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => Base.encode64("print(1)"),
        "lang" => "python"
      })
      |> json_response(401)

    assert response["error"] == "unauthorized"
  end

  test "creates solution from bearer token", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    creator = insert(:user)
    group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: creator.id,
        group_task_id: group_task.id,
        name: "Source Repo Tournament",
        slug: "source-repo-tournament",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })
      |> Repo.insert!()

    {:ok, _player} =
      GroupTournamentContext.create_or_update_player(group_tournament, user.id, %{
        lang: "python",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    {:ok, token} = GroupTournamentContext.create_or_rotate_token(group_tournament, user.id)

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => Base.encode64("def solution():\n    return 7\n"),
        "lang" => "Python"
      })
      |> json_response(201)

    assert response["group_task_solution"]["group_task_id"] == group_task.id
    assert response["group_task_solution"]["user_id"] == user.id
    assert response["group_task_solution"]["lang"] == "python"

    [solution] = GroupTaskContext.list_solutions(group_task)
    assert solution.user_id == user.id
    assert solution.solution =~ "return 7"

    [run] = GroupTournamentContext.list_runs(group_tournament, limit: 1)
    assert run.status == "success"
  end

  test "returns tournament_finished for finished tournaments", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    creator = insert(:user)
    group_task = insert(:group_task)

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: creator.id,
        group_task_id: group_task.id,
        name: "Finished Tournament",
        slug: "finished-tournament",
        description: "Tournament description",
        state: "finished",
        starts_at: DateTime.add(DateTime.utc_now(), -7200, :second),
        started_at: DateTime.add(DateTime.utc_now(), -7100, :second),
        finished_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60
      })
      |> Repo.insert!()

    {:ok, token} = GroupTournamentContext.create_or_rotate_token(group_tournament, user.id)

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => Base.encode64("def solution():\n    return 7\n"),
        "lang" => "Python"
      })
      |> json_response(404)

    assert response["error"] == "tournament_finished"
    assert Repo.aggregate(Codebattle.GroupTaskSolution, :count, :id) == 0
  end

  test "creates a run when submitting a solution for an active tournament", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    creator = insert(:user)
    group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: creator.id,
        group_task_id: group_task.id,
        name: "Active Tournament",
        slug: "active-tournament",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })
      |> Repo.insert!()

    {:ok, _player} =
      GroupTournamentContext.create_or_update_player(group_tournament, user.id, %{
        lang: "python",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    {:ok, token} = GroupTournamentContext.create_or_rotate_token(group_tournament, user.id)

    Application.put_env(
      :codebattle,
      :group_task_runner_response,
      {:ok, %Req.Response{status: 200, body: %{"winner_id" => user.id}}}
    )

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => Base.encode64("def solution():\n    return 7\n"),
        "lang" => "Python"
      })
      |> json_response(201)

    assert response["group_task_solution"]["group_task_id"] == group_task.id
    assert response["group_task_solution"]["user_id"] == user.id

    [run] = GroupTournamentContext.list_runs(group_tournament, limit: 1)
    assert run.status == "success"
    assert run.player_ids == [user.id]
    assert run.result == %{"winner_id" => user.id}

    assert Process.get(:group_task_runner_last_request)
  end

  test "passes include_bots to the runner when tournament enables bots", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    creator = insert(:user)
    group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: creator.id,
        group_task_id: group_task.id,
        name: "Bots Tournament",
        slug: "bots-tournament",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60,
        last_round_started_at: NaiveDateTime.utc_now(:second),
        include_bots: true
      })
      |> Repo.insert!()

    {:ok, _player} =
      GroupTournamentContext.create_or_update_player(group_tournament, user.id, %{
        lang: "python",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    {:ok, token} = GroupTournamentContext.create_or_rotate_token(group_tournament, user.id)

    Application.put_env(
      :codebattle,
      :group_task_runner_response,
      {:ok, %Req.Response{status: 200, body: %{"winner_id" => user.id}}}
    )

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => Base.encode64("def solution():\n    return 7\n"),
        "lang" => "Python"
      })
      |> json_response(201)

    assert response["group_task_solution"]["group_task_id"] == group_task.id
    assert response["group_task_solution"]["user_id"] == user.id

    assert %{opts: opts} = Process.get(:group_task_runner_last_request)
    assert opts |> Keyword.get(:json) |> Map.get(:include_bots) == true
  end

  test "returns validation errors for empty solution payload", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    group_task = insert(:group_task)

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: insert(:user).id,
        group_task_id: group_task.id,
        name: "Validation Tournament",
        slug: "validation-tournament",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })
      |> Repo.insert!()

    {:ok, token} = GroupTournamentContext.create_or_rotate_token(group_tournament, user.id)

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => Base.encode64("   "),
        "lang" => ""
      })
      |> json_response(422)

    assert response["errors"]["solution"] == ["can't be blank"]
    assert response["errors"]["lang"] == ["can't be blank"]
    assert Repo.aggregate(Codebattle.GroupTaskSolution, :count, :id) == 0
  end

  test "returns validation error for malformed solution base64", %{conn: conn} do
    FunWithFlags.enable(:group_tasks_api)

    user = insert(:user)
    group_task = insert(:group_task)

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: insert(:user).id,
        group_task_id: group_task.id,
        name: "Malformed Tournament",
        slug: "malformed-tournament",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 1,
        round_timeout_seconds: 60,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })
      |> Repo.insert!()

    {:ok, token} = GroupTournamentContext.create_or_rotate_token(group_tournament, user.id)

    response =
      conn
      |> put_req_header("authorization", "Bearer #{token.token}")
      |> post("/api/v1/group_task_solutions", %{
        "solution" => "***not-base64***",
        "lang" => "python"
      })
      |> json_response(422)

    assert response["errors"]["solution"] == ["is invalid base64"]
    assert Repo.aggregate(Codebattle.GroupTaskSolution, :count, :id) == 0
  end
end
