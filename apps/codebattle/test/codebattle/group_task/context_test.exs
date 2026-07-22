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

  test "manages group tasks through the public context API" do
    suffix = System.unique_integer([:positive])

    assert {:ok, task} =
             Context.create_group_task(%{
               slug: "context-task-#{suffix}",
               time_to_solve_sec: 300,
               runner_url: "http://runner.test/run"
             })

    assert Context.get_group_task!(task.id).id == task.id
    assert Context.get_group_task(task.id).id == task.id
    assert Enum.any?(Context.list_group_tasks(), &(&1.id == task.id))
    assert Context.change_group_task(task, %{time_to_solve_sec: 400}).valid?
    assert {:ok, updated} = Context.update_group_task(task, %{time_to_solve_sec: 400})
    assert updated.time_to_solve_sec == 400
    assert {:ok, _deleted} = Context.delete_group_task(updated)
    assert Context.get_group_task(task.id) == nil
  end

  test "creates, fetches, updates, and deletes solutions" do
    task = insert(:group_task)
    user = insert(:user)

    assert {:ok, first} =
             Context.create_solution(task.id, user.id, %{
               "lang" => "elixir",
               "solution" => "IO.puts(:ok)"
             })

    assert Context.get_solution!(first.id).id == first.id
    assert Context.get_latest_solution(task.id, user.id).id == first.id
    assert Enum.map(Context.list_solutions(task, limit: 1), & &1.id) == [first.id]
    assert Context.change_solution(first, %{lang: "ruby"}).valid?
    assert {:ok, updated} = Context.update_solution(first, %{lang: "ruby"})
    assert updated.lang == "ruby"

    assert {:ok, second} =
             Context.create_solution_from_submission(task.id, user.id, %{
               lang: "python",
               solution: Base.encode64("print('ok')")
             })

    assert Context.get_latest_solution(task.id, user.id).id == second.id
    assert {:ok, _deleted} = Context.delete_solution(updated)
  end

  test "rejects malformed encoded submissions" do
    task = insert(:group_task)
    user = insert(:user)

    assert {:error, changeset} =
             Context.create_solution_from_submission(task.id, user.id, %{
               lang: "python",
               solution: "not base64!"
             })

    refute changeset.valid?
    assert Keyword.has_key?(changeset.errors, :solution)
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

  test "supports unpersisted synchronous runs and empty asynchronous runs" do
    user = insert(:user)
    task = insert(:group_task, runner_url: "http://runner.test/api/v1/group_tasks")

    solution =
      :group_task_solution
      |> insert(
        user: user,
        group_task: task,
        solution: "def solution, do: 1"
      )
      |> Repo.preload(:user)

    Application.put_env(
      :codebattle,
      :group_task_runner_response,
      {:ok, %Req.Response{status: 200, body: "plain response"}}
    )

    assert {:ok, run} =
             Context.run_group_task(task, [user.id, user.id, -1, "bad"], %{
               solutions: [solution],
               include_bots: true,
               round: 3,
               kind: :seed
             })

    assert run.user_group_tournament_id == nil
    assert run.player_ids == [user.id]
    assert run.status == "success"
    assert run.result == %{"body" => "plain response"}
    assert Process.get(:group_task_runner_last_request).url == "http://runner.test/api/v1/group_tasks/run"

    assert {:ok, nil} = Context.run_group_task_async(task, [user.id], %{})
    assert Context.list_run_results_by_run_key(nil, [user.id]) == []
    assert Context.list_run_results_by_run_key(Ecto.UUID.generate(), []) == []
  end

  test "persists missing-solution and runner failures on tournament runs" do
    user = insert(:user)
    task = insert(:group_task, runner_url: "http://runner.test/run/")
    tournament = insert(:group_tournament, group_task: task, state: "active")
    {:ok, token} = Codebattle.GroupTournament.Context.create_or_rotate_token(tournament, user.id)

    assert {:ok, missing_run} =
             Context.run_group_task(task, [user.id], %{
               group_tournament_id: tournament.id,
               kind: :seed
             })

    assert missing_run.status == "error"
    assert missing_run.result == %{"error" => "solutions_not_found", "missing_player_ids" => [user.id]}

    insert(:group_task_solution,
      user: user,
      group_task: task,
      group_tournament: tournament
    )

    Process.put(
      :group_task_runner_response,
      {:ok, %Req.Response{status: 503, body: "unavailable"}}
    )

    assert {:ok, http_run} =
             Context.run_group_task(task, [user.id], %{
               group_tournament_id: tournament.id,
               kind: :user
             })

    assert http_run.status == "error"

    assert http_run.result == %{
             "error" => "runner_request_failed",
             "status" => 503,
             "body" => %{"body" => "unavailable"}
           }

    Process.put(:group_task_runner_response, {:error, :econnrefused})

    assert {:ok, transport_run} =
             Context.run_group_task(task, [user.id], %{
               group_tournament_id: tournament.id,
               kind: :slice,
               slice_index: 0
             })

    assert transport_run.status == "error"

    assert transport_run.result == %{
             "error" => "runner_request_failed",
             "reason" => ":econnrefused"
           }

    assert Context.get_run!(transport_run.id).id == transport_run.id
    assert Context.list_run_results_by_run_key(transport_run.run_key, [user.id]) == []
    assert token.id == transport_run.user_group_tournament_id
  end

  test "extracts only valid ranked player results and normalizes numbers" do
    run = %UserGroupTournamentRun{
      result: %{
        "summary" => %{
          "ranking" => [
            %{"player_id" => 1, "place" => 1, "score" => 12.7, "duration_ms" => 20.2},
            %{"player_id" => 2, "place" => 2, "score" => "unknown", "duration_ms" => nil},
            %{"player_id" => "bad", "place" => 3},
            %{"player_id" => 4, "place" => 0}
          ]
        }
      }
    }

    assert Context.extract_round_results(run) == [
             %{user_id: 1, place: 1, score: 13, duration_ms: 20},
             %{user_id: 2, place: 2, score: nil, duration_ms: nil}
           ]

    assert Context.extract_round_results(%UserGroupTournamentRun{result: %{}}) == []
  end

  test "filters latest solutions by both naive and UTC cutoffs" do
    task = insert(:group_task)
    user = insert(:user)
    solution = insert(:group_task_solution, group_task: task, user: user)
    naive_cutoff = NaiveDateTime.add(solution.inserted_at, 1, :second)
    utc_cutoff = DateTime.from_naive!(naive_cutoff, "Etc/UTC")

    assert Enum.map(Context.list_latest_solutions(task.id, [user.id], before: naive_cutoff), & &1.id) == [solution.id]
    assert Enum.map(Context.list_latest_solutions(task.id, [user.id], before: utc_cutoff), & &1.id) == [solution.id]

    assert {:error, changeset} =
             Context.create_solution_from_submission(task.id, user.id, %{lang: "js", solution: nil})

    assert Keyword.has_key?(changeset.errors, :solution)
  end
end
