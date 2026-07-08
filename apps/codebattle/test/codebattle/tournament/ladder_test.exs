defmodule Codebattle.Tournament.LadderTest do
  use Codebattle.DataCase, async: false

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

    test "never rematches humans; a player who has faced everyone is bot-filled" do
      insert(:user, is_bot: true)

      tournament =
        build_live_tournament(%{
          players_count: 3,
          # players 2 and 3 have already played each other and player 1 has played both
          played_pair_ids: MapSet.new([[1, 2], [1, 3], [2, 3]])
        })

      put_players(tournament, 1..3)

      {_tournament, pairs} = Ladder.build_round_pairs(tournament)

      # No returned human-human pair may repeat a played pair.
      human_keys =
        pairs
        |> Enum.reject(fn [a, b] -> a.is_bot == true or b.is_bot == true end)
        |> Enum.map(fn [a, b] -> Enum.sort([a.id, b.id]) end)

      assert Enum.all?(human_keys, &(&1 not in [[1, 2], [1, 3], [2, 3]]))
      # everyone got a game (bot-filled), nobody stranded
      assert length(pairs) == 3
      assert Enum.count(pairs, fn [_a, b] -> b.is_bot == true end) == 3
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
  end

  describe "server matchmaking tick" do
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

      state = %{tournament: tournament, frozen: false, break_timer_expired: false}

      assert {:noreply, %{tournament: %{state: "active"}}} =
               Server.handle_info(:matchmaking_tick, state)

      assert_receive :matchmaking_tick, 2_500
    end

    test "does nothing for a non-ladder tournament" do
      tournament = build_live_tournament(%{type: "swiss", module: Codebattle.Tournament.Swiss})
      state = %{tournament: tournament, frozen: false, break_timer_expired: false}

      assert {:noreply, ^state} = Server.handle_info(:matchmaking_tick, state)
      refute_receive :matchmaking_tick, 200
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
