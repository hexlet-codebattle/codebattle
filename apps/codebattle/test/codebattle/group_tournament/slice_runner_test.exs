defmodule Codebattle.GroupTournament.SliceRunnerTest do
  use Codebattle.DataCase

  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament.SliceRunner
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.UserGroupTournament

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

  describe "assign_slices/1 with random strategy" do
    test "partitions players into chunks of slice_size" do
      tournament = insert(:group_tournament, slice_size: 4, slice_strategy: "random")
      players = for _ <- 1..10, do: insert(:group_tournament_player, group_tournament: tournament)

      assert {:ok, 3} = SliceRunner.assign_slices(tournament)

      indices = list_slice_indices(tournament.id)
      assert length(indices) == length(players)
      assert Enum.sort(Enum.uniq(indices)) == [0, 1, 2]
      assert count_index(indices, 0) == 4
      assert count_index(indices, 1) == 4
      assert count_index(indices, 2) == 2
    end

    test "skips left players" do
      tournament = insert(:group_tournament, slice_size: 4)
      _active = for _ <- 1..3, do: insert(:group_tournament_player, group_tournament: tournament, state: "active")

      _left = insert(:group_tournament_player, group_tournament: tournament, state: "left")

      assert {:ok, 1} = SliceRunner.assign_slices(tournament)

      assert [nil] ==
               GroupTournamentPlayer
               |> where([p], p.group_tournament_id == ^tournament.id and p.state == "left")
               |> select([p], p.slice_index)
               |> Repo.all()
    end
  end

  describe "assign_slices/1 with rating strategy" do
    test "orders by slice_ranking ascending, nulls last" do
      tournament = insert(:group_tournament, slice_size: 2, slice_strategy: "rating")

      p1 = insert(:group_tournament_player, group_tournament: tournament, slice_ranking: 3)
      p2 = insert(:group_tournament_player, group_tournament: tournament, slice_ranking: 1)
      p3 = insert(:group_tournament_player, group_tournament: tournament, slice_ranking: 2)
      p_null = insert(:group_tournament_player, group_tournament: tournament, slice_ranking: nil)

      assert {:ok, 2} = SliceRunner.assign_slices(tournament)

      assert slice_index_for(p2.id) == 0
      assert slice_index_for(p3.id) == 0
      assert slice_index_for(p1.id) == 1
      assert slice_index_for(p_null.id) == 1
    end
  end

  describe "run_slice/3" do
    test "calls runner only with players who submitted a solution" do
      Process.put(
        :group_task_runner_response,
        {:ok,
         %Req.Response{
           status: 200,
           body: %{"summary" => %{"ranking" => []}}
         }}
      )

      tournament = setup_tournament_with_players(slice_size: 2)
      [p_with, p_without] = tournament.players

      insert_solution(tournament, p_with)

      assert :ok = SliceRunner.run_slice(tournament, 0)

      request = Process.get(:group_task_runner_last_request)
      assert request, "expected runner to be called"
      sent_player_ids = Enum.map(request.opts[:json].solutions, & &1.player_id)
      assert sent_player_ids == [p_with.user_id]
      refute p_without.user_id in sent_player_ids
    end

    test "skips slice when no players have submissions" do
      tournament = setup_tournament_with_players(slice_size: 2)

      assert :skipped = SliceRunner.run_slice(tournament, 0)
      refute Process.get(:group_task_runner_last_request)
    end
  end

  describe "run_all_slices/2" do
    test "runs every slice that has at least one submission" do
      Process.put(
        :group_task_runner_response,
        {:ok, %Req.Response{status: 200, body: %{"summary" => %{"ranking" => []}}}}
      )

      tournament = setup_tournament_with_players(slice_size: 2, count: 5)
      # slice 0: players 0,1 — only 0 has a solution
      # slice 1: players 2,3 — both have solutions
      # slice 2: player 4 — no solution → skipped
      [p0, _p1, p2, p3, _p4] = tournament.players

      insert_solution(tournament, p0)
      insert_solution(tournament, p2)
      insert_solution(tournament, p3)

      results = SliceRunner.run_all_slices(tournament, max_concurrency: 2)

      by_slice = Map.new(results)
      assert by_slice[0] == :ok
      assert by_slice[1] == :ok
      assert by_slice[2] == :skipped
    end
  end

  defp setup_tournament_with_players(opts) do
    slice_size = Keyword.get(opts, :slice_size, 2)
    count = Keyword.get(opts, :count, 2)

    tournament = insert(:group_tournament, slice_size: slice_size)
    players = for _ <- 1..count, do: insert(:group_tournament_player, group_tournament: tournament)

    Enum.each(players, fn player ->
      Repo.insert!(%UserGroupTournament{
        group_tournament_id: tournament.id,
        user_id: player.user_id,
        state: "ready",
        repo_state: "completed",
        role_state: "completed",
        secret_state: "completed"
      })
    end)

    {:ok, _} = SliceRunner.assign_slices(tournament)

    players_with_assigned =
      players
      |> Enum.map(&Repo.reload!/1)
      |> Enum.sort_by(& &1.slice_index)

    tournament
    |> Repo.preload(:group_task)
    |> Map.put(:players, players_with_assigned)
  end

  defp insert_solution(tournament, player) do
    Repo.insert!(%GroupTaskSolution{
      user_id: player.user_id,
      group_task_id: tournament.group_task_id,
      group_tournament_id: tournament.id,
      lang: "python",
      solution: "print('ok')"
    })
  end

  defp list_slice_indices(group_tournament_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.state == "active")
    |> select([p], p.slice_index)
    |> Repo.all()
  end

  defp slice_index_for(player_id) do
    GroupTournamentPlayer
    |> where([p], p.id == ^player_id)
    |> select([p], p.slice_index)
    |> Repo.one()
  end

  defp count_index(indices, target), do: Enum.count(indices, &(&1 == target))
end
