defmodule Codebattle.GroupTournament.ContextTest do
  use Codebattle.DataCase, async: false
  use Oban.Testing, repo: Codebattle.Repo

  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament.Context
  alias Codebattle.GroupTournament.GlobalSupervisor
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.GroupTournamentRoundScore
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserGroupTournamentRun

  test "lists, fetches, changes, and serializes group tournaments" do
    active = insert(:group_tournament, state: "active", name: "Active")
    waiting = insert(:group_tournament, state: "waiting_participants", name: "Waiting")

    assert [first | tournaments] = Context.list_group_tournaments(sort_by: :name, sort_dir: :asc)
    assert first.id == active.id
    assert Enum.any?(tournaments, &(&1.id == waiting.id))
    assert Context.get_group_tournament!(active.id).id == active.id
    assert Context.get_group_tournament(active.id, preload_players: false).id == active.id
    assert Context.get_group_tournament(-1) == nil

    assert Context.change_group_tournament(active, %{name: "Changed"}).changes.name == "Changed"

    serialized = Context.serialize_group_tournament(Context.get_group_tournament!(active.id))
    assert serialized.id == active.id
    assert serialized.name == "Active"
    assert serialized.group_task_slug == active.group_task.slug
  end

  test "creates, updates, filters, and counts tournament players" do
    tournament = insert(:group_tournament)
    first_user = insert(:user)
    second_user = insert(:user)

    assert {:ok, first} = Context.create_or_update_player(tournament, first_user.id, %{lang: "elixir", slice_index: 0})
    assert {:ok, second} = Context.create_or_update_player(tournament, second_user.id, %{lang: "js"})
    assert {:ok, updated} = Context.create_or_update_player(tournament, first_user.id, %{lang: "ruby"})
    assert updated.id == first.id
    assert updated.lang == "ruby"

    assert Context.get_player(tournament.id, first_user.id).id == first.id
    assert Context.get_player(tournament.id, -1) == nil
    assert Context.count_players(tournament.id) == 2
    assert Context.count_players(tournament.id, slice_index: 0) == 1
    assert Context.count_players(tournament.id, slice_index: :unassigned) == 1

    assert Enum.map(Context.list_players(tournament.id, slice_index: 0), & &1.id) == [first.id]
    assert Enum.map(Context.list_players(tournament.id, slice_index: :unassigned), & &1.id) == [second.id]
    assert Context.list_slice_summaries(tournament.id) == [%{slice_index: 0, count: 1}]
  end

  test "lists only the latest solution per player and supports pagination" do
    tournament = insert(:group_tournament)
    user1 = insert(:user)
    user2 = insert(:user)

    old =
      insert(:group_task_solution,
        group_task: tournament.group_task,
        group_tournament: tournament,
        user: user1,
        solution: "old"
      )

    latest =
      insert(:group_task_solution,
        group_task: tournament.group_task,
        group_tournament: tournament,
        user: user1,
        solution: "latest"
      )

    other =
      insert(:group_task_solution,
        group_task: tournament.group_task,
        group_tournament: tournament,
        user: user2,
        solution: "other"
      )

    assert Context.count_latest_solutions(tournament.id, tournament.group_task_id) == 2

    ids =
      tournament.id
      |> Context.list_paginated_solutions(tournament.group_task_id, limit: 10, offset: 0)
      |> Enum.map(& &1.id)

    assert Enum.sort(ids) == Enum.sort([latest.id, other.id])
    refute old.id in ids
  end

  test "bulk transfers users without duplicating existing rows" do
    tournament = insert(:group_tournament)
    users = [insert(:user), insert(:user)]

    assert :ok = Context.bulk_transfer_players(tournament.id, users)
    assert :ok = Context.bulk_transfer_players(tournament.id, users)

    assert Repo.aggregate(
             from(p in GroupTournamentPlayer, where: p.group_tournament_id == ^tournament.id),
             :count
           ) == 2

    assert Repo.aggregate(
             from(t in UserGroupTournament, where: t.group_tournament_id == ^tournament.id),
             :count
           ) == 2
  end

  test "solution submission rejects unknown tokens" do
    assert Context.create_solution_from_token("missing", %{}) == {:error, :invalid_token}
    assert Context.create_solution_from_token_and_run("missing", %{}) == {:error, :invalid_token}
    assert Context.maybe_run_after_solution_submission(nil, %GroupTaskSolution{}) == :ok
    assert Context.maybe_run_after_solution_submission(1, nil) == :ok
  end

  test "creates, updates, reads from the live server, and deletes a tournament" do
    creator = insert(:user)
    group_task = insert(:group_task)

    attrs = %{
      creator_id: creator.id,
      group_task_id: group_task.id,
      name: "Coverage tournament",
      slug: "Coverage Tournament",
      description: "A tournament created through the context",
      starts_at: DateTime.add(DateTime.utc_now(), 3600, :second),
      rounds_count: 2,
      round_timeout_seconds: 60
    }

    assert {:error, changeset} = Context.create_group_tournament(%{name: "x"})
    refute changeset.valid?

    assert {:ok, tournament} = Context.create_group_tournament(attrs)
    on_exit(fn -> GlobalSupervisor.terminate_group_tournament(tournament.id) end)

    assert tournament.slug == "coverage tournament"
    assert Context.get_current(tournament.id).id == tournament.id
    assert Context.get_current_for_player_page(tournament.id).id == tournament.id
    assert Context.get_current_for_player_page!(tournament.id).id == tournament.id
    assert_raise Ecto.NoResultsError, fn -> Context.get_current_for_player_page!(-1) end
    assert :ok = Context.ensure_server_started(tournament.id)

    assert {:ok, updated} = Context.update_group_tournament(tournament, %{name: "Updated coverage"})
    assert updated.name == "Updated coverage"

    assert {:error, invalid_update} = Context.update_group_tournament(updated, %{name: "x"})
    refute invalid_update.valid?

    assert {:ok, deleted} = Context.delete_group_tournament(updated)
    assert deleted.id == tournament.id
    assert Context.get_group_tournament(tournament.id) == nil
  end

  test "retries accumulated tournament state and can then reset its roster" do
    tournament =
      insert(:group_tournament,
        state: "finished",
        starts_at: DateTime.add(DateTime.utc_now(), -3600, :second),
        started_at: DateTime.add(DateTime.utc_now(), -3500, :second),
        finished_at: DateTime.add(DateTime.utc_now(), -100, :second),
        current_round_position: 2,
        meta: %{"finished" => true}
      )

    user = insert(:user)

    player =
      insert(:group_tournament_player,
        group_tournament: tournament,
        user: user,
        state: "left",
        total_score: 50,
        seed_score: 10,
        seed_duration_ms: 20,
        slice_index: 1,
        slice_ranking: 2,
        place: 3,
        last_round_place: 4,
        consecutive_zero_rounds: 2
      )

    token =
      Repo.insert!(%UserGroupTournament{
        user_id: user.id,
        group_tournament_id: tournament.id,
        state: "ready"
      })

    run = insert_run(tournament, token, user.id, "slice", Ecto.UUID.generate())

    round_score =
      Repo.insert!(%GroupTournamentRoundScore{
        group_tournament_id: tournament.id,
        user_id: user.id,
        run_id: run.id,
        round_position: 2,
        slice_index: 1,
        place: 1,
        score: 50
      })

    solution =
      insert(:group_task_solution,
        group_task: tournament.group_task,
        group_tournament: tournament,
        user: user
      )

    tournament = Context.get_group_tournament!(tournament.id)
    on_exit(fn -> GlobalSupervisor.terminate_group_tournament(tournament.id) end)

    assert {:ok, retried} = Context.retry_group_tournament(tournament)
    assert retried.state == "waiting_participants"
    assert retried.current_round_position == 0
    assert retried.meta == %{}
    assert DateTime.after?(retried.starts_at, DateTime.utc_now())

    reset_player = Repo.get!(GroupTournamentPlayer, player.id)
    assert reset_player.state == "active"
    assert reset_player.total_score == 0
    assert reset_player.seed_score == nil
    assert reset_player.slice_index == nil
    refute Repo.get(UserGroupTournamentRun, run.id)
    refute Repo.get(GroupTournamentRoundScore, round_score.id)
    refute Repo.get(GroupTaskSolution, solution.id)

    assert {:ok, reset} = Context.reset_group_tournament(retried)
    assert reset.state == "waiting_participants"
    refute Context.get_player(tournament.id, user.id)
    refute Repo.get(UserGroupTournament, token.id)
  end

  test "lists and counts deduplicated runs with kind and viewer filters" do
    tournament = insert(:group_tournament)
    user1 = insert(:user)
    user2 = insert(:user)
    token1 = Repo.insert!(%UserGroupTournament{user_id: user1.id, group_tournament_id: tournament.id})
    token2 = Repo.insert!(%UserGroupTournament{user_id: user2.id, group_tournament_id: tournament.id})
    shared_key = Ecto.UUID.generate()

    first = insert_run(tournament, token1, user1.id, "slice", shared_key)
    second = insert_run(tournament, token2, user2.id, "slice", shared_key)
    user_run = insert_run(tournament, token1, user1.id, "user", Ecto.UUID.generate())

    ids = tournament |> Context.list_runs(limit: :infinity) |> Enum.map(& &1.id)
    assert Enum.sort(ids) == Enum.sort([second.id, user_run.id])
    refute first.id in ids
    assert Enum.map(Context.list_runs(tournament.id, kind: :user), & &1.id) == [user_run.id]

    visible_ids =
      tournament.id
      |> Context.list_runs(kind: [:slice, :seed], visible_for_user_id: user1.id, limit: 10)
      |> Enum.map(& &1.id)

    assert visible_ids == [first.id]
    assert Context.count_runs(tournament, kind: :slice) == 1
    assert Context.count_runs(tournament.id, kind: :user) == 1
    assert Context.count_runs(tournament.id, kind: :seed) == 0

    serialized = Context.serialize_run(user_run)
    assert serialized.id == user_run.id
    assert serialized.player_ids == [user1.id]
  end

  test "delegates token lifecycle and stores submissions for valid tokens" do
    user = insert(:user)
    task = insert(:group_task)
    active = insert(:group_tournament, group_task: task, state: "active")

    assert {:ok, token} = Context.create_or_rotate_token(active, user.id)
    assert {:ok, same_token} = Context.get_or_create_token(active, user.id)
    assert same_token.id == token.id
    assert Context.get_token_by_value(token.token).id == token.id
    assert Enum.map(Context.list_tokens(active), & &1.id) == [token.id]

    assert {:ok, stored} =
             Context.create_solution_from_token(token.token, %{
               "lang" => "Elixir",
               "solution" => Base.encode64("def solution, do: 42")
             })

    assert stored.user_id == user.id
    assert stored.group_tournament_id == active.id
    assert stored.lang == "elixir"

    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, submitted} =
               Context.create_solution_from_token_and_run(token.token, %{
                 lang: "Ruby",
                 solution: Base.encode64("def solution = 42")
               })

      assert submitted.lang == "ruby"
      assert_enqueued(worker: Codebattle.Workers.GroupTaskSolutionPostSubmitWorker)
    end)

    finished = insert(:group_tournament, state: "finished")
    assert {:ok, finished_token} = Context.create_or_rotate_token(finished.id, user.id)

    assert Context.create_solution_from_token_and_run(finished_token.token, %{}) ==
             {:error, :tournament_finished}
  end

  test "builds the persisted leaderboard including round and seed scores" do
    tournament = insert(:group_tournament)
    seeded_user = insert(:user, name: "Seeded")
    plain_user = insert(:user, name: "Plain")

    insert(:group_tournament_player,
      group_tournament: tournament,
      user: seeded_user,
      total_score: 30,
      seed_score: 7,
      slice_index: 2,
      last_round_place: 1
    )

    insert(:group_tournament_player,
      group_tournament: tournament,
      user: plain_user,
      total_score: 10,
      seed_score: nil,
      slice_index: nil
    )

    Repo.insert!(%GroupTournamentRoundScore{
      group_tournament_id: tournament.id,
      user_id: seeded_user.id,
      round_position: 2,
      slice_index: 2,
      place: 1,
      score: 30
    })

    assert [seeded, plain] = Context.build_leaderboard(tournament.id)
    assert seeded.user_id == seeded_user.id
    assert seeded.rounds[1] == %{slice_index: 2, place: nil, score: 7}
    assert seeded.rounds[2] == %{slice_index: 2, place: 1, score: 30}
    assert plain.user_id == plain_user.id
    assert plain.rounds == %{}
  end

  test "authorizes run details for admins, owners, and participating players" do
    tournament = insert(:group_tournament)
    owner = insert(:user)
    participant = insert(:user)
    stranger = insert(:user)
    admin = insert(:admin)
    token = Repo.insert!(%UserGroupTournament{user_id: owner.id, group_tournament_id: tournament.id})

    solution =
      insert(:group_task_solution,
        group_task: tournament.group_task,
        group_tournament: tournament,
        user: owner,
        solution: "owner solution"
      )

    run = insert_run(tournament, token, participant.id, "user", Ecto.UUID.generate())

    for viewer <- [admin, owner, participant] do
      assert %{run: details} = Context.get_run_details!(run.id, viewer)
      assert details.id == run.id
      assert details.group_tournament_id == tournament.id
      assert details.solution.id == solution.id
    end

    assert_raise Ecto.NoResultsError, fn -> Context.get_run_details!(run.id, stranger) end
  end

  test "uses default run pagination and skips previews for inactive tournaments" do
    tournament = insert(:group_tournament, state: "waiting_participants")
    user = insert(:user)
    token = Repo.insert!(%UserGroupTournament{user_id: user.id, group_tournament_id: tournament.id})
    run = insert_run(tournament, token, user.id, "user", Ecto.UUID.generate())

    assert Enum.map(Context.list_runs(tournament), & &1.id) == [run.id]
    assert Context.count_runs(tournament) == 1

    solution = insert(:group_task_solution, group_task: tournament.group_task, user: user)
    assert Context.maybe_run_after_solution_submission(tournament.id, solution) == :ok
    assert Context.count_runs(tournament) == 1
  end

  test "runs direct previews for seed, unsliced ranked, and individual tournaments" do
    previous_client = Application.get_env(:codebattle, :group_task_runner_http_client)
    Application.put_env(:codebattle, :group_task_runner_http_client, CodebattleWeb.FakeGroupTaskRunnerHttpClient)

    on_exit(fn ->
      Application.put_env(:codebattle, :group_task_runner_http_client, previous_client)
      Process.delete(:group_task_runner_response)
      Process.delete(:group_task_runner_last_request)
    end)

    for attrs <- [
          %{type: "ranked", has_seed_round: true, current_round_position: 1},
          %{type: "ranked", has_seed_round: false, current_round_position: 2},
          %{type: "individual", current_round_position: 1}
        ] do
      user = insert(:user)
      task = insert(:group_task, runner_url: "http://runner.test/run")
      tournament = insert(:group_tournament, Map.merge(attrs, %{group_task: task, state: "active"}))
      {:ok, _token} = Context.create_or_rotate_token(tournament, user.id)

      solution =
        insert(:group_task_solution,
          group_task: task,
          group_tournament: tournament,
          user: user,
          solution: "preview solution"
        )

      Process.put(
        :group_task_runner_response,
        {:ok, %Req.Response{status: 200, body: %{"summary" => %{"ranking" => []}}}}
      )

      assert Context.maybe_run_after_solution_submission(tournament.id, solution) == :ok
      assert Context.count_runs(tournament) == 1
    end
  end

  defp insert_run(tournament, token, user_id, kind, run_key) do
    Repo.insert!(%UserGroupTournamentRun{
      user_group_tournament_id: token.id,
      group_task_id: tournament.group_task_id,
      group_tournament_id: tournament.id,
      run_key: run_key,
      player_ids: [user_id],
      kind: kind,
      status: "success",
      result: %{"ok" => true},
      score: 10,
      duration_ms: 20
    })
  end
end
