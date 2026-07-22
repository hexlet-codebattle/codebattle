defmodule Codebattle.Tournament.LadderTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Ladder
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Server

  describe "build_round_pairs / pairing" do
    test "pairs the whole active roster into head-to-head duos" do
      tournament = build_live_tournament(%{players_count: 4})
      put_players(tournament, 1..4)

      {_tournament, pairs} = Ladder.build_round_pairs(tournament)

      assert length(pairs) == 2
      paired_ids = pairs |> Enum.flat_map(fn [a, b] -> [a.id, b.id] end) |> Enum.sort()
      assert paired_ids == [1, 2, 3, 4]
      refute Enum.any?(pairs, fn [a, b] -> a.is_bot == true or b.is_bot == true end)
    end

    test "bot-fills the odd player out" do
      insert(:user, is_bot: true)
      tournament = build_live_tournament(%{players_count: 3})
      put_players(tournament, 1..3)

      {_tournament, pairs} = Ladder.build_round_pairs(tournament)

      assert length(pairs) == 2
      bot_pairs = Enum.filter(pairs, fn [_a, b] -> b.is_bot end)
      assert length(bot_pairs) == 1
    end

    test "excludes players currently in a playing match" do
      tournament = build_live_tournament(%{players_count: 4})
      put_players(tournament, 1..4)

      Tournament.Matches.put_match(
        tournament,
        %Match{id: 0, player_ids: [1, 2], round_position: 0, state: "playing"}
      )

      {_tournament, pairs} = Ladder.build_round_pairs(tournament)

      paired_ids = Enum.flat_map(pairs, fn [a, b] -> [a.id, b.id] end)
      refute 1 in paired_ids
      refute 2 in paired_ids
      assert Enum.sort(paired_ids) == [3, 4]
    end

    test "excludes bots and banned players from the pool" do
      tournament = build_live_tournament(%{players_count: 2})
      Tournament.Players.put_player(tournament, Player.new!(%{id: 1, name: "p1"}))
      # `state` is not a cast field on Player, so set the banned state on the struct directly.
      Tournament.Players.put_player(tournament, %{Player.new!(%{id: 2, name: "p2"}) | state: "banned"})
      Tournament.Players.put_player(tournament, Player.new!(%{id: 3, name: "bot", is_bot: true}))

      insert(:user, is_bot: true)
      {_tournament, pairs} = Ladder.build_round_pairs(tournament)

      # Only player 1 is eligible -> paired with a bot; banned/bot players never in the pool.
      assert [[a, b]] = pairs
      assert a.id == 1
      assert b.is_bot
    end

    test "prefers a fresh opponent, but rematches humans rather than bot-filling both" do
      # Two players who have already faced each other are the only ones available. Instead of
      # giving each a bot, they are re-paired with each other (rematch preferred over a bot).
      tournament =
        build_live_tournament(%{
          players_count: 2,
          played_pair_ids: MapSet.new([[1, 2]])
        })

      put_players(tournament, 1..2)

      {_tournament, pairs} = Ladder.build_round_pairs(tournament)

      assert [[a, b]] = pairs
      refute a.is_bot == true or b.is_bot == true
      assert Enum.sort([a.id, b.id]) == [1, 2]
    end

    test "does not create an avoidable rematch when a constrained fresh pairing exists" do
      tournament =
        build_live_tournament(%{
          players_count: 4,
          played_pair_ids: MapSet.new([[1, 4], [2, 3], [3, 4]])
        })

      put_players(tournament, 1..4)

      {_tournament, pairs} = Ladder.build_round_pairs(tournament)
      pair_ids = pairs |> Enum.map(fn [a, b] -> Enum.sort([a.id, b.id]) end) |> Enum.sort()

      # Picking player 2 for player 1 would strand 3 and 4 in a rematch. Player 3 has
      # fewer alternatives, so pairing 1-3 leaves the fresh 2-4 pairing available.
      assert pair_ids == [[1, 3], [2, 4]]
    end

    test "bot-fills only the genuinely-odd player when everyone has faced everyone" do
      insert(:user, is_bot: true)

      tournament =
        build_live_tournament(%{
          players_count: 3,
          # every pair among players 1..3 has already been played
          played_pair_ids: MapSet.new([[1, 2], [1, 3], [2, 3]])
        })

      put_players(tournament, 1..3)

      {_tournament, pairs} = Ladder.build_round_pairs(tournament)

      # One human rematch pair + one bot pair; all three humans placed, exactly one bot used.
      assert length(pairs) == 2
      assert Enum.count(pairs, fn [_a, b] -> b.is_bot == true end) == 1

      human_ids =
        pairs
        |> Enum.flat_map(fn [a, b] -> [a, b] end)
        |> Enum.reject(& &1.is_bot)
        |> Enum.map(& &1.id)
        |> Enum.sort()

      assert human_ids == [1, 2, 3]
    end

    test "records only human pairs in played_pair_ids" do
      insert(:user, is_bot: true)
      tournament = build_live_tournament(%{players_count: 3})
      put_players(tournament, 1..3)

      {tournament, _pairs} = Ladder.build_round_pairs(tournament)

      played = MapSet.new(tournament.played_pair_ids)
      # exactly one human pair recorded (the third player was bot-filled)
      assert MapSet.size(played) == 1
      # every recorded key is a pair of two humans (ids 1..3), never involving a bot id
      assert Enum.all?(played, fn [a, b] -> a in 1..3 and b in 1..3 end)
    end
  end

  describe "finish predicates" do
    test "finish_round_after_match? is always false (no break/round-finish machinery)" do
      tournament = build_live_tournament(%{rounds_limit: 3, current_round_position: 1})
      refute Ladder.finish_round_after_match?(tournament)
    end

    test "finish_tournament? true only when ticks are exhausted and no game is playing" do
      base = build_live_tournament(%{rounds_limit: 3})

      # ticks remain -> not finished
      refute Ladder.finish_tournament?(%{base | current_round_position: 0})

      # ticks exhausted, no playing matches -> finished
      assert Ladder.finish_tournament?(%{base | current_round_position: 2})

      # ticks exhausted but a game still playing -> not finished (must drain first)
      Tournament.Matches.put_match(
        base,
        %Match{id: 0, player_ids: [1, 2], round_position: 2, state: "playing"}
      )

      refute Ladder.finish_tournament?(%{base | current_round_position: 2})
    end
  end

  describe "match scoring" do
    test "puts final static scores into the match as soon as the game finishes" do
      task = insert(:task, base_score: 100, time_to_solve_sec: 100)

      tournament =
        build_live_tournament(%{
          players_count: 2,
          task_ids: [task.id]
        })

      put_players(tournament, 1..2)
      Tournament.Tasks.put_task(tournament, task)

      Tournament.Matches.put_match(tournament, %Match{
        id: 0,
        game_id: 123,
        task_id: task.id,
        player_ids: [1, 2],
        round_position: 0,
        state: "playing"
      })

      Ladder.finish_match(tournament, %{
        ref: 0,
        game_id: 123,
        game_state: "game_over",
        duration_sec: 20,
        player_results: %{
          1 => %{lang: "js", rating: 1200, result: "won", result_percent: 100.0},
          2 => %{lang: "js", rating: 1200, result: "lost", result_percent: 80.0}
        }
      })

      match = Tournament.Matches.get_match(tournament, 0)
      assert match.player_results[1].score == 180
      assert match.player_results[1].base_score == 100
      assert match.player_results[1].score_factor == 1.8
      assert match.player_results[2].score == 60
      assert match.player_results[2].base_score == 100
      assert match.player_results[2].score_factor == 0.75
    end
  end

  describe "round timeout" do
    test "uses current task base_score as the next matchmaking tick timeout" do
      task0 = insert(:task, base_score: 90, time_to_solve_sec: 70)
      task1 = insert(:task, base_score: 150, time_to_solve_sec: 120)

      tournament =
        build_live_tournament(%{
          current_round_position: 0,
          round_timeout_seconds: 60,
          timeout_mode: "per_task",
          task_ids: [task0.id, task1.id]
        })

      Tournament.Tasks.put_tasks(tournament, [task0, task1])

      assert Ladder.round_timeout_seconds(tournament) == 90
      assert Ladder.round_timeout_seconds(%{tournament | current_round_position: 1}) == 150
    end

    test "uses 3/4 of configured round_timeout_seconds when timeout mode is not per_task" do
      task = insert(:task, base_score: 90, time_to_solve_sec: 70)

      tournament =
        build_live_tournament(%{
          current_round_position: 0,
          round_timeout_seconds: 60,
          timeout_mode: "per_round_fixed",
          task_ids: [task.id]
        })

      Tournament.Tasks.put_task(tournament, task)

      assert Ladder.round_timeout_seconds(tournament) == 45
    end

    test "falls back to configured round_timeout_seconds in per_task when the current task is missing" do
      tournament =
        build_live_tournament(%{
          current_round_position: 0,
          round_timeout_seconds: 60,
          timeout_mode: "per_task",
          task_ids: []
        })

      assert Ladder.round_timeout_seconds(tournament) == 60
    end

    test "uses the final task solve time for the per_task final deadline" do
      task0 = insert(:task, base_score: 90, time_to_solve_sec: 70)
      task1 = insert(:task, base_score: 150, time_to_solve_sec: 120)

      tournament =
        build_live_tournament(%{
          current_round_position: 1,
          round_timeout_seconds: 60,
          timeout_mode: "per_task",
          task_ids: [task0.id, task1.id]
        })

      Tournament.Tasks.put_tasks(tournament, [task0, task1])

      assert Ladder.final_deadline_seconds(tournament) == 120
    end

    test "uses the configured round time for a fixed-time final deadline" do
      tournament =
        build_live_tournament(%{
          round_timeout_seconds: 80,
          timeout_mode: "per_round_fixed"
        })

      assert Ladder.round_timeout_seconds(tournament) == 60
      assert Ladder.final_deadline_seconds(tournament) == 80
    end

    test "uses safe timeout fallbacks when configuration or tasks are absent" do
      tournament =
        build_live_tournament(%{
          round_timeout_seconds: nil,
          timeout_mode: "per_task",
          task_ids: []
        })

      assert Ladder.final_deadline_seconds(tournament) == 60
      assert Ladder.round_timeout_seconds(%{tournament | timeout_mode: "per_round_fixed"}) == nil
      assert Ladder.final_deadline_seconds(%{tournament | timeout_mode: "per_round_fixed"}) == 60
    end
  end

  test "exposes no-op callbacks and broadcasts ladder wait states" do
    active = build_live_tournament(%{rounds_limit: 2, current_round_position: 0})
    final = %{active | current_round_position: 1}

    assert Ladder.game_type() == "duo"
    assert Ladder.complete_players(active) == active
    assert Ladder.reset_meta(%{key: :value}) == %{key: :value}
    assert Ladder.calculate_round_results(active) == active
    assert Ladder.maybe_finish_round_after_finish_match(active) == active

    Codebattle.PubSub.subscribe("game:101")
    assert Ladder.maybe_create_rematch(active, %{game_id: 101}) == active
    assert_receive %Message{event: "tournament:game:wait", payload: %{type: "round"}}

    Codebattle.PubSub.subscribe("game:102")
    assert Ladder.maybe_create_rematch(final, %{game_id: 102}) == final
    assert_receive %Message{event: "tournament:game:wait", payload: %{type: "tournament"}}
  end

  test "handles missing task metadata, bots, and marked cheaters while scoring" do
    tournament =
      build_live_tournament(%{
        cheater_ids: [1],
        round_timeout_seconds: 10,
        task_ids: []
      })

    match = %Match{task_id: -1, player_ids: [-1, 1, 2]}

    results =
      Ladder.prepare_match_player_results(tournament, match, %{
        game_state: "game_over",
        duration_sec: nil,
        player_results: %{
          -1 => %{result: "lost", result_percent: 0},
          1 => %{result: "won", result_percent: 100},
          2 => %{result: "lost", result_percent: 50}
        }
      })

    assert results[-1] == %{result: "lost", result_percent: 0}
    assert results[1].score == 0
    assert results[1].score_factor == 0.0
    assert results[2].score == 0
    assert results[2].score_factor == 1.0
  end

  describe "server matchmaking tick" do
    test "notifies player channels after ladder scores are recomputed" do
      tournament = build_live_tournament(%{players_count: 0, rounds_limit: 3})
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")

      Ladder.matchmaking_tick(tournament)

      assert_receive %Message{event: "tournament:results_updated", payload: %{}}
    end

    test "re-arms the next tick while the tournament is active" do
      task = insert(:task, base_score: 2, time_to_solve_sec: 1)

      tournament =
        build_live_tournament(%{
          players_count: 0,
          rounds_limit: 3,
          round_timeout_seconds: 60,
          timeout_mode: "per_task",
          task_ids: [task.id]
        })

      Tournament.Tasks.put_task(tournament, task)

      state = %{
        tournament: tournament,
        frozen: false,
        break_timer_expired: false,
        next_matchmaking_tick_at: nil,
        matchmaking_timer_ref: nil
      }

      assert {:noreply, %{tournament: %{state: "active"}}} =
               Server.handle_info({:matchmaking_tick, tournament.current_round_position}, state)

      # A fresh tick is re-armed for the current round.
      assert_receive {:matchmaking_tick, _round_position}, 2_500
    end

    test "drops a stale tick tagged with an already-advanced round" do
      tournament =
        build_live_tournament(%{
          players_count: 0,
          rounds_limit: 3,
          round_timeout_seconds: 60,
          timeout_mode: "per_task",
          current_round_position: 2
        })

      state = %{
        tournament: tournament,
        frozen: false,
        break_timer_expired: false,
        next_matchmaking_tick_at: nil,
        matchmaking_timer_ref: nil
      }

      # Tick was armed under round 0 but the round has since advanced to 2 — drop it, no re-arm.
      assert {:noreply, ^state} = Server.handle_info({:matchmaking_tick, 0}, state)
      refute_receive {:matchmaking_tick, _}, 200
    end

    test "does not run a regular matchmaking tick after the final wave was created" do
      tournament =
        build_live_tournament(%{
          players_count: 0,
          rounds_limit: 1,
          current_round_position: 0
        })

      timer_ref = Process.send_after(self(), :existing_final_deadline, 10_000)

      state = %{
        tournament: tournament,
        frozen: false,
        break_timer_expired: false,
        next_matchmaking_tick_at: System.monotonic_time(:millisecond) + 10_000,
        matchmaking_timer_ref: timer_ref,
        matchmaking_timer_kind: :final_deadline
      }

      assert {:noreply, ^state} =
               Server.handle_info({:matchmaking_tick, tournament.current_round_position}, state)

      assert Process.read_timer(timer_ref) > 0
      Process.cancel_timer(timer_ref)
    end

    test "does nothing for a non-ladder tournament" do
      tournament = build_live_tournament(%{type: "swiss", module: Codebattle.Tournament.Swiss})

      state = %{
        tournament: tournament,
        frozen: false,
        break_timer_expired: false,
        next_matchmaking_tick_at: nil,
        matchmaking_timer_ref: nil
      }

      assert {:noreply, ^state} = Server.handle_info({:matchmaking_tick, tournament.current_round_position}, state)
      refute_receive {:matchmaking_tick, _}, 200
    end
  end

  describe "config validation" do
    test "coerces static_base_score / by_user and keeps timeout mode and round_timeout_seconds" do
      changeset =
        TournamentContext.validate(%{
          "name" => "ladder cfg",
          "description" => "ladder cfg",
          "starts_at" => "2026-01-01T12:00",
          "type" => "ladder",
          "timeout_mode" => "per_round_fixed",
          "score_strategy" => "75_percentile",
          "ranking_type" => "by_clan",
          "round_timeout_seconds" => 60,
          "rounds_limit" => 8
        })

      assert Ecto.Changeset.get_field(changeset, :timeout_mode) == "per_round_fixed"
      assert Ecto.Changeset.get_field(changeset, :score_strategy) == "static_base_score"
      assert Ecto.Changeset.get_field(changeset, :ranking_type) == "by_user"
      assert Ecto.Changeset.get_field(changeset, :round_timeout_seconds) == 60
    end

    test "requires round_timeout_seconds for ladder" do
      changeset =
        TournamentContext.validate(%{
          "name" => "ladder cfg",
          "description" => "ladder cfg",
          "starts_at" => "2026-01-01T12:00",
          "type" => "ladder",
          "rounds_limit" => 8
        })

      refute changeset.valid?
      assert %{round_timeout_seconds: _} = errors_on(changeset)
    end

    test "keeps round_timeout_seconds for ladder per_task payloads" do
      changeset =
        TournamentContext.validate(%{
          "name" => "ladder cfg",
          "description" => "ladder cfg",
          "starts_at" => "2026-01-01T12:00",
          "type" => "ladder",
          "timeout_mode" => "per_task",
          "round_timeout_seconds" => 60,
          "rounds_limit" => 8
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :timeout_mode) == "per_task"
      assert Ecto.Changeset.get_field(changeset, :round_timeout_seconds) == 60
    end

    test "creates a ladder tournament end to end" do
      task = insert(:task, level: "easy", time_to_solve_sec: 60)
      insert(:task_pack, name: "ladder-cfg", task_ids: [task.id])
      creator = insert(:user)

      {:ok, tournament} =
        TournamentContext.create(%{
          "starts_at" => "2026-01-01T12:00",
          "name" => "Ladder",
          "description" => "ladder create",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "task_pack_name" => "ladder-cfg",
          "creator" => creator,
          "task_provider" => "task_pack",
          "task_strategy" => "sequential",
          "type" => "ladder",
          "state" => "waiting_participants",
          "round_timeout_seconds" => 60,
          "rounds_limit" => "5",
          "players_limit" => 16
        })

      assert tournament.type == "ladder"
      assert tournament.timeout_mode == "per_task"
      assert tournament.score_strategy == "static_base_score"
      assert tournament.ranking_type == "by_user"
      assert tournament.round_timeout_seconds == 60
    end
  end

  # Helpers

  defp put_players(tournament, ids) do
    for id <- ids do
      Tournament.Players.put_player(
        tournament,
        Player.new!(%{id: id, name: "p#{id}", state: "active", score: id})
      )
    end
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  defp build_live_tournament(attrs) do
    tournament_id = System.unique_integer([:positive, :monotonic])

    tournament =
      :tournament
      |> insert(
        id: tournament_id,
        type: "ladder",
        ranking_type: "by_user",
        score_strategy: "static_base_score",
        timeout_mode: "per_task",
        state: "active",
        rounds_limit: 3
      )
      |> Map.merge(%{
        current_round_position: 0,
        module: Ladder,
        players_count: 0,
        players_table: Tournament.Players.create_table(tournament_id),
        matches_table: Tournament.Matches.create_table(tournament_id),
        ranking_table: Tournament.Ranking.create_table(tournament_id),
        tasks_table: Tournament.Tasks.create_table(tournament_id),
        clans_table: Tournament.Clans.create_table(tournament_id)
      })
      |> Map.merge(attrs)

    on_exit(fn ->
      Enum.each(
        [
          tournament.players_table,
          tournament.matches_table,
          tournament.ranking_table,
          tournament.tasks_table,
          tournament.clans_table
        ],
        &safe_delete_ets/1
      )
    end)

    tournament
  end

  defp safe_delete_ets(table) do
    :ets.delete(table)
  rescue
    _ -> :ok
  end
end
