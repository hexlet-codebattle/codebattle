defmodule Codebattle.GroupTask.ContextTest do
  use Codebattle.DataCase
  use Oban.Testing, repo: Codebattle.Repo

  alias Codebattle.GroupTask.Context
  alias Codebattle.PubSub.Message
  alias Codebattle.Repo
  alias Codebattle.UserGroupTournamentRun
  alias Codebattle.Workers.GroupTaskSolutionRunWorker

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

  test "lists only solutions for the requested group tournament" do
    user = insert(:user)
    other_user = insert(:user)
    group_task = insert(:group_task)
    tournament = insert(:group_tournament, group_task: group_task)
    other_tournament = insert(:group_tournament, group_task: group_task)

    old_solution =
      insert(:group_task_solution,
        user: user,
        group_task: group_task,
        group_tournament: other_tournament,
        solution: "old"
      )

    kept_solution =
      insert(:group_task_solution,
        user: user,
        group_task: group_task,
        group_tournament: tournament,
        solution: "kept"
      )

    other_player_solution =
      insert(:group_task_solution,
        user: other_user,
        group_task: group_task,
        group_tournament: tournament,
        solution: "other-player"
      )

    assert [user_solution] =
             Context.list_user_solutions(group_task.id, user.id, group_tournament_id: tournament.id)

    assert user_solution.id == kept_solution.id
    assert user_solution.group_tournament_id == tournament.id

    latest_solutions =
      Context.list_latest_solutions(group_task.id, [user.id, other_user.id], group_tournament_id: tournament.id)

    assert Enum.map(latest_solutions, & &1.id) == [kept_solution.id, other_player_solution.id]
    assert Enum.all?(latest_solutions, &(&1.group_tournament_id == tournament.id))
    refute Enum.any?(latest_solutions, &(&1.id == old_solution.id))
  end

  test "stores tournament scoped submissions from submission payloads" do
    user = insert(:user)
    group_task = insert(:group_task)
    tournament = insert(:group_tournament, group_task: group_task)

    assert {:ok, solution} =
             Context.create_solution_from_submission(group_task.id, user.id, %{
               group_tournament_id: tournament.id,
               lang: "Python",
               solution: Base.encode64("def solution():\n    return 42\n")
             })

    assert solution.group_tournament_id == tournament.id
    assert solution.solution =~ "return 42"
  end

  describe "run_group_task_async/3" do
    setup do
      user = insert(:user)
      group_task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks/run")
      tournament = insert(:group_tournament, group_task: group_task, state: "active")

      {:ok, _token} = Codebattle.GroupTournament.Context.create_or_rotate_token(tournament, user.id)

      insert(:group_task_solution,
        user: user,
        group_task: group_task,
        group_tournament: tournament,
        solution: "def solution():\n    return 7\n",
        lang: "python"
      )

      %{user: user, group_task: group_task, tournament: tournament}
    end

    test "inserts a pending run synchronously and defers the runner call to the Oban worker",
         %{user: user, group_task: group_task, tournament: tournament} do
      Application.put_env(
        :codebattle,
        :group_task_runner_response,
        {:ok, %Req.Response{status: 200, body: %{"winner_id" => user.id}}}
      )

      Oban.Testing.with_testing_mode(:manual, fn ->
        assert {:ok, %UserGroupTournamentRun{} = run} =
                 Context.run_group_task_async(group_task, [user.id], %{
                   group_tournament_id: tournament.id,
                   round: 1
                 })

        assert run.status == "pending"
        assert run.score == nil
        # The runner must NOT have been touched until the job drains.
        refute Process.get(:group_task_runner_last_request)
        assert_enqueued(worker: GroupTaskSolutionRunWorker)

        Oban.drain_queue(queue: :default)

        run = Repo.reload(run)
        assert run.status == "success"
        assert run.result == %{"winner_id" => user.id}
        assert Process.get(:group_task_runner_last_request)
      end)
    end

    test "broadcasts pending before finished on the tournament-wide topic",
         %{user: user, group_task: group_task, tournament: tournament} do
      Application.put_env(
        :codebattle,
        :group_task_runner_response,
        {:ok, %Req.Response{status: 200, body: %{"winner_id" => user.id}}}
      )

      Codebattle.PubSub.subscribe("group_tournament:#{tournament.id}")
      user_id = user.id

      assert {:ok, _run} =
               Context.run_group_task_async(group_task, [user.id], %{
                 group_tournament_id: tournament.id,
                 round: 1
               })

      assert_receive %Message{
        event: "group_tournament:run_updated",
        payload: %{status: "pending", user_id: ^user_id, score: nil}
      }

      assert_receive %Message{
        event: "group_tournament:run_updated",
        payload: %{status: "success", user_id: ^user_id}
      }
    end

    test "returns a changeset error when the player is not linked to the tournament",
         %{group_task: group_task, tournament: tournament} do
      stranger = insert(:user)

      assert {:error, %Ecto.Changeset{} = changeset} =
               Context.run_group_task_async(group_task, [stranger.id], %{
                 group_tournament_id: tournament.id,
                 round: 1
               })

      assert {"are not linked to the group tournament: " <> _, _} = changeset.errors[:player_ids]
      assert [] = all_enqueued(worker: GroupTaskSolutionRunWorker)
    end
  end
end
