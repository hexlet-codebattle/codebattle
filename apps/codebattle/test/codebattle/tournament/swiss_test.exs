defmodule Codebattle.Tournament.SwissTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Ranking.ByUser
  alias Codebattle.Tournament.Server
  alias Codebattle.Tournament.Swiss

  test "does not finish round after one match while another is still playing" do
    tournament =
      :tournament
      |> insert(
        type: "swiss",
        state: "active",
        rounds_limit: 3,
        use_infinite_break: true
      )
      |> Map.merge(%{
        current_round_position: 0,
        players_count: 4,
        players: %{
          1 => Player.new!(%{id: 1, name: "p1", state: "active"}),
          2 => Player.new!(%{id: 2, name: "p2", state: "active"}),
          3 => Player.new!(%{id: 3, name: "p3", state: "active"}),
          4 => Player.new!(%{id: 4, name: "p4", state: "active"})
        },
        matches: %{
          1 => %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "game_over"},
          2 => %Match{id: 2, player_ids: [3, 4], round_position: 0, state: "playing"}
        }
      })

    result = Swiss.maybe_finish_round_after_finish_match(tournament)

    assert result.current_round_position == tournament.current_round_position
    assert result.break_state == "off"
    assert is_nil(result.last_round_ended_at)
  end

  test "handle_game_result is idempotent for an already finished match" do
    tournament = build_live_tournament(%{players_count: 2})

    Tournament.Players.put_player(tournament, Player.new!(%{id: 1, name: "p1", state: "active"}))
    Tournament.Players.put_player(tournament, Player.new!(%{id: 2, name: "p2", state: "active"}))

    Tournament.Matches.put_match(
      tournament,
      %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "playing"}
    )

    params = %{
      ref: 1,
      game_state: "game_over",
      duration_sec: 12,
      player_results: %{
        1 => %{lang: "js", rating: 1200, result: "won"},
        2 => %{lang: "js", rating: 1100, result: "lost"}
      }
    }

    Swiss.handle_game_result(tournament, params)
    Swiss.handle_game_result(tournament, params)

    assert Tournament.Players.get_player(tournament, 1).wins_count == 1
    assert Tournament.Players.get_player(tournament, 2).wins_count == 0
    assert Tournament.Matches.get_match(tournament, 1).state == "game_over"
  end

  test "defers finished game events until the match exists" do
    tournament = build_live_tournament(%{players_count: 2})
    state = %{tournament: tournament, frozen: false}

    message = %{
      topic: "game:tournament:#{tournament.id}",
      event: "game:tournament:finished",
      payload: %{ref: 404, game_id: 123, game_state: "game_over", player_results: %{}, duration_sec: 1}
    }

    assert {:noreply, ^state} = Server.handle_info(message, state)
    assert_receive ^message, 1_200
  end

  test "toggle_cheater_player updates player state and tournament cheater ids" do
    tournament = build_live_tournament(%{players_count: 2})
    state = %{tournament: tournament, frozen: false}

    Tournament.Players.put_player(tournament, Player.new!(%{id: 1, name: "p1", state: "active"}))
    Tournament.Players.put_player(tournament, Player.new!(%{id: 2, name: "p2", state: "active"}))

    assert {:reply, updated_tournament, updated_state} =
             Server.handle_call({:fire_event, :toggle_cheater_player, %{user_id: 1}}, nil, state)

    assert updated_tournament.cheater_ids == [1]
    assert Tournament.Players.get_player(updated_tournament, 1).state == "banned"
    assert updated_state.tournament.cheater_ids == [1]

    assert {:reply, unbanned_tournament, _updated_state} =
             Server.handle_call(
               {:fire_event, :toggle_cheater_player, %{user_id: 1}},
               nil,
               updated_state
             )

    assert unbanned_tournament.cheater_ids == []
    assert Tournament.Players.get_player(unbanned_tournament, 1).state == "active"
  end

  test "by_user ranking updates first round scores before swiss round two" do
    tournament =
      build_live_tournament(%{
        current_round_position: 0,
        ranking_type: "by_user",
        players_count: 2
      })

    Tournament.Players.put_player(
      tournament,
      Player.new!(%{id: 1, name: "p1", state: "active", score: 0, place: 0})
    )

    Tournament.Players.put_player(
      tournament,
      Player.new!(%{id: 2, name: "p2", state: "active", score: 0, place: 0})
    )

    insert(:tournament_result,
      tournament_id: tournament.id,
      user_id: 1,
      user_name: "p1",
      user_lang: "js",
      score: 10,
      duration_sec: 5,
      round_position: 0
    )

    insert(:tournament_result,
      tournament_id: tournament.id,
      user_id: 2,
      user_name: "p2",
      user_lang: "js",
      score: 3,
      duration_sec: 8,
      round_position: 0
    )

    ByUser.set_ranking(tournament)

    assert Tournament.Players.get_player(tournament, 1).score == 10
    assert Tournament.Players.get_player(tournament, 1).place == 1
    assert Tournament.Players.get_player(tournament, 2).score == 3
    assert Tournament.Players.get_player(tournament, 2).place == 2
  end

  test "start keeps swiss played_pair_ids in live tournament state" do
    task = insert(:task, level: "easy", time_to_solve_sec: 60)
    insert(:task_pack, name: "swiss-played-pairs", task_ids: [task.id])

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Swiss played pairs",
        "description" => "played pairs",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "swiss-played-pairs",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_user",
        "type" => "swiss",
        "state" => "waiting_participants",
        "rounds_limit" => "2",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)

    assert MapSet.size(MapSet.new(tournament.played_pair_ids)) == 2
  end

  test "round finish schedules next round from server process after break" do
    task = insert(:task, level: "easy", time_to_solve_sec: 1)
    insert(:task_pack, name: "swiss-break-autostart", task_ids: [task.id])

    creator = insert(:user)
    users = [insert(:user), insert(:user)]

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Swiss break autostart",
        "description" => "break autostart",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "swiss-break-autostart",
        "creator" => creator,
        "break_duration_seconds" => 1,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_user",
        "type" => "swiss",
        "state" => "waiting_participants",
        "rounds_limit" => "2",
        "players_limit" => 2
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    [match] = get_matches(tournament)

    assert {:ok, _game} = GameContext.trigger_timeout(match.game_id)

    Process.sleep(1_600)

    tournament = TournamentContext.get(tournament.id)

    assert tournament.current_round_position == 1
    assert tournament.round_state == "active"
    assert tournament.break_state == "off"
  end

  defp build_live_tournament(attrs) do
    tournament_id = System.unique_integer([:positive, :monotonic])

    tournament =
      :tournament
      |> insert(
        id: tournament_id,
        type: "swiss",
        ranking_type: "by_user",
        state: "active",
        rounds_limit: 3,
        use_infinite_break: true
      )
      |> Map.merge(%{
        current_round_position: 0,
        module: Swiss,
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
