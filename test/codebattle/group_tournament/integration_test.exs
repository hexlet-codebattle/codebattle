defmodule Codebattle.GroupTournament.IntegrationTest do
  use Codebattle.DataCase

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.SliceRunner
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.UserGroupTournament

  setup do
    Application.put_env(:codebattle, :group_task_runner_http_client, CodebattleWeb.DeterministicGroupTaskRunner)

    on_exit(fn ->
      Application.delete_env(:codebattle, :group_task_runner_http_client)
      Application.delete_env(:codebattle, :deterministic_runner_scores)
      Process.delete(:group_task_runner_last_request)
    end)

    :ok
  end

  defp put_scores(scores), do: Application.put_env(:codebattle, :deterministic_runner_scores, scores)

  describe "ranked tournament full lifecycle (16 players × 4 slices of 4)" do
    test "seeding → 3 slice rounds: total_scores evolve, slices reshuffle, top players climb" do
      tournament =
        build_ranked_tournament(slice_size: 4, rounds_count: 4, max_score: 1000, slice_count: 4)

      players = create_players_with_tokens(tournament, 16)

      # Submit a base solution for each so the runner has something to score.
      Enum.each(players, &insert_solution(tournament, &1, "code-#{&1.user_id}"))

      # Assign deterministic seed scores: player_id N gets seed_score = 100 + N
      # (higher player_id = higher score initially).
      seed_scores = Map.new(players, fn p -> {p.user_id, 100 + p.user_id} end)
      put_scores(seed_scores)

      # === ROUND 1: SEEDING ===
      # Seed scoring no longer re-runs at round end — it reads each player's
      # latest preview run for round 1. Materialise those rows by running a
      # preview per player against the deterministic runner.
      tournament = set_round(tournament, 1)
      simulate_seed_previews(tournament, players)

      seed_results = SliceRunner.run_seeding(tournament)
      ok_count = Enum.count(seed_results, fn {_uid, status} -> status == :ok end)
      assert ok_count == 16

      # Each player's seed_score should now be persisted.
      for p <- players do
        reloaded = Repo.reload!(p)
        assert reloaded.seed_score == seed_scores[p.user_id]
        assert is_integer(reloaded.seed_duration_ms)
      end

      # Apply initial slice assignment via "rating" strategy.
      tournament_for_seed = %{tournament | slice_strategy: "rating", slice_count: 4}
      {:ok, slice_count} = SliceRunner.assign_slices(tournament_for_seed)
      assert slice_count == 4

      # Top 4 by seed_score (player_ids highest first) should be in slice 0.
      top_player_ids =
        players
        |> Enum.sort_by(& &1.user_id, :desc)
        |> Enum.take(4)
        |> Enum.map(& &1.user_id)

      slice_0_ids = list_user_ids_in_slice(tournament.id, 0)
      assert MapSet.new(slice_0_ids) == MapSet.new(top_player_ids)

      # === ROUND 2: First slice round ===
      tournament = set_round(tournament, 2)
      tournament = reload_tournament(tournament)

      # Within each slice, the player with highest user_id wins (same scores
      # config still in play). We'll watch how the cascade moves players.
      slice_results = SliceRunner.run_all_slices(tournament, max_concurrency: 4)

      # All slices ran successfully.
      for {_idx, status, _round} <- slice_results, do: assert(status == :ok)

      # Collect round_results and apply movement.
      round_results =
        Enum.flat_map(slice_results, fn
          {_idx, :ok, results} -> results
          _ -> []
        end)

      assert length(round_results) == 16

      # Now apply the cascade.
      {:ok, _} = SliceRunner.apply_movement(tournament, round_results)

      # After cascade:
      # - The top slice's 1st (highest user_id of the 4 in slice 0) stays in slice 0.
      # - Slice 0's 2nd, 3rd, 4th cascade to slices 1, 2, 3.
      # - Each lower slice's 1st promotes by 1 (which means slice 1's 1st → slice 0,
      #   slice 2's 1st → slice 1, slice 3's 1st → slice 2).

      # Each player should have a total_score updated. Sum across all players
      # must be > 0.
      total_score_sum =
        Repo.one(
          from(p in GroupTournamentPlayer, where: p.group_tournament_id == ^tournament.id, select: sum(p.total_score))
        )

      assert total_score_sum > 0

      # Specifically: slice 0 / 1st (R=0) earned 1000. Slice 3 (bottom) / 4th
      # earned 0 (R = 3 + 3 = 6, R_max = 3 + 3 = 6, so ratio=1 → 0).
      assert player_total_score(tournament.id, top_user_id_in_slice_before(slice_0_ids, seed_scores)) >= 1000

      # === ROUND 3: Second slice round ===
      tournament = set_round(tournament, 3)
      tournament = reload_tournament(tournament)

      slice_results = SliceRunner.run_all_slices(tournament, max_concurrency: 4)
      for {_idx, status, _round} <- slice_results, do: assert(status == :ok)

      round_results =
        Enum.flat_map(slice_results, fn
          {_idx, :ok, results} -> results
          _ -> []
        end)

      {:ok, _} = SliceRunner.apply_movement(tournament, round_results)

      # === ROUND 4: Final slice round ===
      tournament = set_round(tournament, 4)
      tournament = reload_tournament(tournament)

      slice_results = SliceRunner.run_all_slices(tournament, max_concurrency: 4)
      for {_idx, status, _round} <- slice_results, do: assert(status == :ok)

      round_results =
        Enum.flat_map(slice_results, fn
          {_idx, :ok, results} -> results
          _ -> []
        end)

      {:ok, _} = SliceRunner.apply_movement(tournament, round_results)

      # === FINAL ASSERTIONS ===
      final_players = list_players(tournament.id)
      assert length(final_players) == 16

      # All 16 players have a total_score field populated.
      assert Enum.all?(final_players, fn p -> is_integer(p.total_score) and p.total_score >= 0 end)

      # Every player has a slice_index in range [0, 3].
      assert Enum.all?(final_players, fn p -> p.slice_index in 0..3 end)

      # Top player by total_score should be among the strongest seeds.
      top_player = Enum.max_by(final_players, & &1.total_score)
      assert top_player.user_id in Enum.take(Enum.sort(Enum.map(players, & &1.user_id), :desc), 8)

      # Bottom player by total_score should be among the weakest seeds.
      bottom_player = Enum.min_by(final_players, & &1.total_score)
      assert bottom_player.user_id in Enum.take(Enum.sort(Enum.map(players, & &1.user_id)), 8)
    end
  end

  describe "ranked tournament with score upset (low-seed player wins every round)" do
    test "an underdog who wins every round climbs slices" do
      tournament =
        build_ranked_tournament(slice_size: 4, rounds_count: 5, max_score: 1000, slice_count: 4)

      players = create_players_with_tokens(tournament, 16)

      Enum.each(players, &insert_solution(tournament, &1, "code-#{&1.user_id}"))

      # Seed: high user_id = high score (so user_id 16 → slice 0, user_id 1 → slice 3).
      seed_scores = Map.new(players, fn p -> {p.user_id, p.user_id} end)
      put_scores(seed_scores)

      tournament = set_round(tournament, 1)
      simulate_seed_previews(tournament, players)
      _ = SliceRunner.run_seeding(tournament)
      tournament_for_seed = %{tournament | slice_strategy: "rating", slice_count: 4}
      {:ok, _} = SliceRunner.assign_slices(tournament_for_seed)

      underdog_id =
        players
        |> Enum.min_by(& &1.user_id)
        |> Map.get(:user_id)

      assert slice_for(tournament.id, underdog_id) == 3

      # For each slice round, override scores so underdog (and only underdog)
      # gets the max in their current slice → they always finish 1st and
      # promote upward.

      for round_no <- 2..5 do
        tournament = tournament |> set_round(round_no) |> reload_tournament()
        current_slice = slice_for(tournament.id, underdog_id)

        boost_underdog(seed_scores, underdog_id, current_slice, tournament.id)

        slice_results = SliceRunner.run_all_slices(tournament, max_concurrency: 4)
        for {_idx, status, _r} <- slice_results, do: assert(status == :ok)

        round_results =
          Enum.flat_map(slice_results, fn
            {_idx, :ok, results} -> results
            _ -> []
          end)

        {:ok, _} = SliceRunner.apply_movement(tournament, round_results)
      end

      # Underdog started at slice 3, won 4 rounds → should be in slice 3-4=-1
      # clamped to 0 (or close to it: each win promotes by 1, but max promotion
      # is `rounds`).
      final_slice = slice_for(tournament.id, underdog_id)
      assert final_slice < 3, "expected underdog to climb above starting slice 3, got slice #{final_slice}"
    end
  end

  describe "individual tournament" do
    test "total_score = max(run scores), no seeding round, no slice cascade" do
      tournament = build_individual_tournament(rounds_count: 1)
      [p1] = create_players_with_tokens(tournament, 1)

      insert_solution(tournament, p1, "x")

      put_scores(%{p1.user_id => 500})

      {:ok, _run} =
        GroupTaskContext.run_group_task(
          Repo.preload(tournament, :group_task).group_task,
          [p1.user_id],
          %{group_tournament_id: tournament.id, include_bots: true}
        )

      reloaded = Repo.reload!(p1)
      assert reloaded.total_score == 500

      # Now submit a worse run — total_score should NOT drop.
      put_scores(%{p1.user_id => 100})

      {:ok, _} =
        GroupTaskContext.run_group_task(
          Repo.preload(tournament, :group_task).group_task,
          [p1.user_id],
          %{group_tournament_id: tournament.id, include_bots: true}
        )

      reloaded2 = Repo.reload!(p1)
      assert reloaded2.total_score == 500, "individual scoring keeps the max"

      # And a better run does raise it.
      put_scores(%{p1.user_id => 800})

      {:ok, _} =
        GroupTaskContext.run_group_task(
          Repo.preload(tournament, :group_task).group_task,
          [p1.user_id],
          %{group_tournament_id: tournament.id, include_bots: true}
        )

      reloaded3 = Repo.reload!(p1)
      assert reloaded3.total_score == 800
    end
  end

  describe "inactive players (consecutive zero rounds)" do
    test "a player who never submits accumulates consecutive_zero_rounds (visible via persist)" do
      tournament = build_ranked_tournament(slice_size: 4, rounds_count: 3, max_score: 1000)
      players = create_players_with_tokens(tournament, 8)

      Enum.each(players, fn p -> insert_solution(tournament, p, "x-#{p.user_id}") end)

      tournament = %{tournament | slice_count: 2}

      # Manually assign slices: top 4 user_ids to slice 0, bottom 4 to slice 1.
      sorted = Enum.sort_by(players, & &1.user_id, :desc)
      assign_manually(sorted, [0, 0, 0, 0, 1, 1, 1, 1])

      # Score everyone the same way — bottom slice 4th player consistently
      # gets last place (round_points = 0) → should accumulate consecutive_zero_rounds.
      scores = Map.new(players, fn p -> {p.user_id, p.user_id} end)
      put_scores(scores)

      tournament = tournament |> set_round(2) |> reload_tournament()

      _slice_results = SliceRunner.run_all_slices(tournament, max_concurrency: 2)

      # Bottom slice / last place (user_id 1) → round_points = 0 with our quadratic curve at R = 1 + 3 = 4
      # Actually R_max = 1 + 3 = 4. R = 4 → ratio = 1.0 → 0 points.
      last_place_player = Enum.min_by(players, & &1.user_id)
      reloaded = Repo.reload!(last_place_player)

      assert reloaded.total_score == 0
      assert reloaded.consecutive_zero_rounds == 1
    end

    test "apply_movement keeps slice sizes balanced across many rounds (mirrored_cascade reproducer)" do
      # Repro for the tournament-13 bug: slice_size=8, slice_count=7,
      # mirrored_cascade — without the normalize pass the cascade drained
      # the top slices and overflowed the bottom one. After the fix slices
      # 0..slice_count-2 must each hold exactly slice_size players and the
      # bottom slice gets the remainder (here zero remainder → also 8).

      slice_size = 8
      slice_count = 7
      player_count = slice_size * slice_count

      tournament =
        build_ranked_tournament(
          slice_size: slice_size,
          rounds_count: 6,
          max_score: 1000,
          slice_count: slice_count
        )

      players = create_players_with_tokens(tournament, player_count)
      Enum.each(players, fn p -> insert_solution(tournament, p, "x-#{p.user_id}") end)

      sorted_desc = Enum.sort_by(players, & &1.user_id, :desc)

      slice_assignment =
        sorted_desc
        |> Enum.with_index()
        |> Enum.map(fn {_p, idx} -> div(idx, slice_size) end)

      assign_manually(sorted_desc, slice_assignment)

      scores = Map.new(players, fn p -> {p.user_id, p.user_id} end)
      put_scores(scores)

      for round_no <- 2..6 do
        tournament = tournament |> set_round(round_no) |> reload_tournament()
        slice_results = SliceRunner.run_all_slices(tournament, max_concurrency: 4)

        round_results =
          Enum.flat_map(slice_results, fn
            {_idx, :ok, results} -> results
            _ -> []
          end)

        {:ok, _} = SliceRunner.apply_movement(tournament, round_results)

        sizes =
          for slice_idx <- 0..(slice_count - 1) do
            length(list_user_ids_in_slice(tournament.id, slice_idx))
          end

        # Every slice except the bottom must equal slice_size.
        for {size, idx} <- Enum.with_index(sizes), idx < slice_count - 1 do
          assert size == slice_size,
                 "round #{round_no}: slice #{idx} has #{size} players, expected #{slice_size}. sizes=#{inspect(sizes)}"
        end

        # Bottom slice holds the remainder (0..slice_size players).
        bottom = List.last(sizes)
        assert bottom >= 0 and bottom <= slice_size

        # Total conserved.
        assert Enum.sum(sizes) == player_count
      end
    end

    test "post-round transitions keep zero-scoring players active in the bottom slice" do
      tournament =
        build_ranked_tournament(slice_size: 4, rounds_count: 5, max_score: 1000, slice_count: 2)

      players = create_players_with_tokens(tournament, 8)
      Enum.each(players, fn p -> insert_solution(tournament, p, "x-#{p.user_id}") end)

      sorted_desc = Enum.sort_by(players, & &1.user_id, :desc)
      assign_manually(sorted_desc, [0, 0, 0, 0, 1, 1, 1, 1])

      last_place_player = Enum.min_by(players, & &1.user_id)

      # Underdog never scores; everyone else gets their user_id worth.
      scores =
        Map.new(players, fn p ->
          {p.user_id, if(p.user_id == last_place_player.user_id, do: 0, else: p.user_id)}
        end)

      put_scores(scores)

      # Run several slice rounds and apply movement after each — the old code
      # would mark this player as "left" once consecutive_zero_rounds hit the
      # threshold (default 2). With auto-leave removed they must stay active
      # and remain in the bottom slice.
      for round_no <- 2..4 do
        tournament = tournament |> set_round(round_no) |> reload_tournament()
        slice_results = SliceRunner.run_all_slices(tournament, max_concurrency: 2)

        round_results =
          Enum.flat_map(slice_results, fn
            {_idx, :ok, results} -> results
            _ -> []
          end)

        {:ok, _} = SliceRunner.apply_movement(tournament, round_results)
      end

      reloaded = Repo.reload!(last_place_player)

      assert reloaded.state == "active", "inactive player should stay active, got #{reloaded.state}"
      assert reloaded.consecutive_zero_rounds >= 2, "expected zero-streak to accumulate past the old threshold"
      assert reloaded.slice_index == 1, "inactive player should settle in the bottom slice"
      assert reloaded.total_score == 0
    end
  end

  # === Helpers ===

  defp build_ranked_tournament(opts) do
    # started_at must be set so runs receive a non-nil submission duration
    # (duration_ms = solution.inserted_at - tournament.started_at). Backdate
    # by 60s so solutions inserted in the test land at a positive offset.
    :group_tournament
    |> insert(%{
      type: "ranked",
      state: "active",
      started_at: DateTime.add(DateTime.utc_now(:second), -60, :second),
      slice_size: Keyword.get(opts, :slice_size, 4),
      rounds_count: Keyword.get(opts, :rounds_count, 3),
      max_score: Keyword.get(opts, :max_score, 1000),
      scoring_strategy: "diagonal_quadratic",
      movement_strategy: "mirrored_cascade",
      place_weight: 1,
      include_bots: false,
      slice_count: Keyword.get(opts, :slice_count)
    })
    |> Repo.preload(:group_task)
  end

  defp build_individual_tournament(opts) do
    :group_tournament
    |> insert(%{
      type: "individual",
      state: "active",
      slice_size: Keyword.get(opts, :slice_size, 1),
      rounds_count: Keyword.get(opts, :rounds_count, 1),
      include_bots: true
    })
    |> Repo.preload(:group_task)
  end

  defp create_players_with_tokens(tournament, count) do
    for _ <- 1..count do
      player = insert(:group_tournament_player, group_tournament: tournament, state: "active")

      Repo.insert!(%UserGroupTournament{
        group_tournament_id: tournament.id,
        user_id: player.user_id,
        state: "ready",
        repo_state: "completed",
        role_state: "completed",
        secret_state: "completed"
      })

      player
    end
  end

  defp insert_solution(tournament, player, code) do
    Repo.insert!(%GroupTaskSolution{
      user_id: player.user_id,
      group_task_id: tournament.group_task_id,
      group_tournament_id: tournament.id,
      lang: "python",
      solution: code
    })
  end

  defp set_round(%GroupTournament{} = t, n) do
    t
    |> GroupTournament.changeset(%{current_round_position: n})
    |> Repo.update!()
    |> Repo.preload([:group_task])
  end

  # Produce a `UserGroupTournamentRun` per player for the current round so
  # `SliceRunner.run_seeding/2` (which now reads instead of re-runs) has
  # something to pick up. Scores come from `put_scores`.
  defp simulate_seed_previews(%GroupTournament{} = tournament, players) do
    tournament = Repo.preload(tournament, :group_task)

    Enum.each(players, fn p ->
      {:ok, _} =
        GroupTaskContext.run_group_task(tournament.group_task, [p.user_id], %{
          group_tournament_id: tournament.id,
          include_bots: true
        })
    end)

    tournament
  end

  defp reload_tournament(%GroupTournament{id: id}) do
    GroupTournament
    |> Repo.get!(id)
    |> Repo.preload([:group_task])
  end

  defp list_user_ids_in_slice(group_tournament_id, slice_index) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.slice_index == ^slice_index)
    |> select([p], p.user_id)
    |> Repo.all()
  end

  defp slice_for(group_tournament_id, user_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.user_id == ^user_id)
    |> select([p], p.slice_index)
    |> Repo.one()
  end

  defp list_players(group_tournament_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id)
    |> Repo.all()
  end

  defp player_total_score(group_tournament_id, user_id) do
    GroupTournamentPlayer
    |> where([p], p.group_tournament_id == ^group_tournament_id and p.user_id == ^user_id)
    |> select([p], p.total_score)
    |> Repo.one()
  end

  # Find the user_id with the highest seed score among a slice's members.
  defp top_user_id_in_slice_before(user_ids, scores) do
    Enum.max_by(user_ids, &Map.get(scores, &1, 0))
  end

  defp boost_underdog(_seed_scores, underdog_id, current_slice, group_tournament_id) do
    # Set scores so the underdog has the highest in their current slice.
    slice_mates = list_user_ids_in_slice(group_tournament_id, current_slice)
    scores = Map.new(slice_mates, fn id -> {id, if(id == underdog_id, do: 9999, else: 100)} end)
    # Keep zero for everyone else (we don't care about other slices' rankings here)
    put_scores(scores)
  end

  defp assign_manually(players, slice_indexes) do
    players
    |> Enum.zip(slice_indexes)
    |> Enum.each(fn {player, slice_index} ->
      player
      |> Ecto.Changeset.change(slice_index: slice_index)
      |> Repo.update!()
    end)
  end
end
