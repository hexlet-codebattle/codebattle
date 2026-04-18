defmodule CodebattleWeb.Api.V1.GroupTournamentControllerTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.Repo
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  setup do
    Application.put_env(:codebattle, :group_task_runner_http_client, CodebattleWeb.FakeGroupTaskRunnerHttpClient)

    on_exit(fn ->
      Application.delete_env(:codebattle, :group_task_runner_http_client)
      Application.delete_env(:codebattle, :group_task_runner_response)
      Process.delete(:group_task_runner_last_request)
      Process.delete(:group_task_runner_response)
    end)

    :ok
  end

  test "submitting a solution runs the checker immediately for active group tournaments", %{conn: conn} do
    user = insert(:user)
    opponent = insert(:user)
    creator = insert(:user)
    group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")

    group_tournament =
      %GroupTournament{}
      |> GroupTournament.changeset(%{
        creator_id: creator.id,
        group_task_id: group_task.id,
        name: "Immediate Run Tournament",
        slug: "immediate-run-tournament-#{System.unique_integer([:positive])}",
        description: "Tournament description",
        state: "active",
        starts_at: DateTime.add(DateTime.utc_now(), -60, :second),
        started_at: DateTime.utc_now(:second),
        current_round_position: 1,
        rounds_count: 3,
        round_timeout_seconds: 3600,
        last_round_started_at: NaiveDateTime.utc_now(:second)
      })
      |> Repo.insert!()

    {:ok, _} =
      GroupTournamentContext.create_or_update_player(group_tournament, user.id, %{
        lang: "python",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    {:ok, _} =
      GroupTournamentContext.create_or_update_player(group_tournament, opponent.id, %{
        lang: "javascript",
        state: "active",
        last_setup_at: DateTime.utc_now(:second)
      })

    UserGroupTournamentContext.get_or_create(user, group_tournament)
    UserGroupTournamentContext.get_or_create(opponent, group_tournament)

    insert(:group_task_solution,
      user: opponent,
      group_task: group_task,
      group_tournament: group_tournament,
      lang: "javascript",
      solution: "console.log(2)"
    )

    Application.put_env(
      :codebattle,
      :group_task_runner_response,
      {:ok, %Req.Response{status: 200, body: %{"winner_id" => user.id}}}
    )

    conn =
      conn
      |> put_session(:user_id, user.id)
      |> post("/api/v1/group_tournaments/#{group_tournament.id}/submit_solution", %{
        "solution" => "print(1)"
      })

    response = json_response(conn, 200)
    assert response["ok"] == true
    assert response["solution"]["user_id"] == user.id
    assert response["solution"]["lang"] == "python"

    updated_group_tournament = GroupTournamentContext.get_current(group_tournament.id)
    assert updated_group_tournament.meta["last_run_status"] == "success"
    assert updated_group_tournament.meta["last_run_result"] == %{"winner_id" => user.id}
    assert updated_group_tournament.meta["last_run_id"]

    [run] = GroupTournamentContext.list_runs(group_tournament, limit: 1)
    assert run.status == "success"
    assert run.player_ids == Enum.sort([user.id, opponent.id])
    assert run.result == %{"winner_id" => user.id}
  end
end
