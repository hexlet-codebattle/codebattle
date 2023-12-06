defmodule Codebattle.Tournament.Integration.SwissTaskPackTest do
  use Codebattle.IntegrationCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Player
  @module Codebattle.Tournament.Swiss

  @rounds_config_json """
    [
      {"task_pack_id": _1, "round_timeout_seconds": 30},
      {"task_pack_id": _2, "round_timeout_seconds": 40},
      {"task_pack_id": _3, "round_timeout_seconds": 50}
    ]
  """

  setup do
    user = insert(:user)
    users = insert_list(7, :user)

    tasks1 = insert_list(6, :task, level: "elementary")
    tasks2 = insert_list(5, :task, level: "easy")
    tasks3 = insert_list(3, :task, level: "medium")

    task_pack1 = insert(:task_pack, creator_id: user.id, task_ids: Enum.map(tasks1, & &1.id))
    task_pack2 = insert(:task_pack, creator_id: user.id, task_ids: Enum.map(tasks2, & &1.id))
    task_pack3 = insert(:task_pack, creator_id: user.id, task_ids: Enum.map(tasks3, & &1.id))

    rounds_config_json =
      @rounds_config_json
      |> String.replace("_1", to_string(task_pack1.id))
      |> String.replace("_2", to_string(task_pack2.id))
      |> String.replace("_3", to_string(task_pack3.id))

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Swiss",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => user,
        "rounds_limit" => "3",
        "rounds_config_json" => rounds_config_json,
        "break_duration_seconds" => 0,
        "rounds_config_type" => "per_round",
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    %{user: user, users: users, tournament: tournament}
  end

  describe "Full tournament" do
    test "works",
         %{user: user, users: users, tournament: tournament} do
      [user1 = %{id: user_id1} | _] = users

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament.is_live
      assert tournament.module == @module
      assert tournament.state == "active"
      assert Tournament.Players.count(tournament) == 8
      assert Tournament.Tasks.count(tournament) == 6

      assert tournament |> get_matches("playing") |> Enum.count() == 4

      assert tournament.current_round == 0
      assert MapSet.size(tournament.played_pair_ids) == 4

      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert %{
               player_ids: player_ids,
               state: "game_over",
               winner_id: ^user_id1
             } =
               tournament
               |> get_matches("game_over")
               |> List.first()

      opponent_id = get_opponent(player_ids, user_id1)

      assert %Player{score: 3, wins_count: 0} = tournament |> get_player(opponent_id)
      assert %Player{score: 8, wins_count: 1} = tournament |> get_player(user_id1)

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(100)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament |> get_matches("game_over") |> Enum.count() == 1
      assert tournament |> get_matches("timeout") |> Enum.count() == 4
      assert tournament |> get_matches("playing") |> Enum.count() == 4
      assert players_count(tournament) == 8
      assert MapSet.size(tournament.played_pair_ids) == 8
      assert tournament.current_round == 1
      assert Tournament.Tasks.count(tournament) == 5

      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert %{
               player_ids: player_ids,
               state: "game_over",
               winner_id: ^user_id1
             } =
               tournament
               |> get_matches("game_over")
               |> Enum.sort_by(& &1.id, :desc)
               |> List.first()

      opponent_id = get_opponent(player_ids, user_id1)

      assert %Player{score: 3, wins_count: 0} = tournament |> get_player(opponent_id)
      assert %Player{score: 16, wins_count: 2} = tournament |> get_player(user_id1)

      tournament = Tournament.Server.get_tournament(tournament.id)
      send_user_win_match(tournament, user1)
      :timer.sleep(100)
      tournament = Tournament.Server.get_tournament(tournament.id)
      send_user_win_match(tournament, user1)
      :timer.sleep(100)
      tournament = Tournament.Server.get_tournament(tournament.id)
      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert %Player{score: 12, wins_count: 0} = tournament |> get_player(opponent_id)
      assert %Player{score: 40, wins_count: 5} = tournament |> get_player(user_id1)

      assert tournament |> get_matches("game_over") |> Enum.count() == 5
      assert tournament |> get_matches("timeout") |> Enum.count() == 4
      assert tournament |> get_matches("playing") |> Enum.count() == 4
      assert MapSet.size(tournament.played_pair_ids) == 8
      assert tournament.current_round == 1
      assert Tournament.Tasks.count(tournament) == 5

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(100)
      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament |> get_matches("game_over") |> Enum.count() == 5
      assert tournament |> get_matches("timeout") |> Enum.count() == 8
      assert tournament |> get_matches("playing") |> Enum.count() == 4
      assert MapSet.size(tournament.played_pair_ids) == 12
      assert tournament.current_round == 2
      assert Tournament.Tasks.count(tournament) == 3
      assert tournament.show_results == true

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(100)

      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament.state == "finished"
      assert tournament |> get_matches("game_over") |> Enum.count() == 5
      assert tournament |> get_matches("timeout") |> Enum.count() == 12
      assert tournament |> get_matches("playing") |> Enum.count() == 0
      assert tournament.show_results == false
      assert MapSet.size(tournament.played_pair_ids) == 12
      assert Tournament.Tasks.count(tournament) == 3
      assert tournament.current_round == 2
    end
  end

  describe "Rematch takes uniq task_ids" do
    test "works",
         %{user: user, users: users, tournament: tournament} do
      [user1 = %{id: user_id1} | _] = users

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament.is_live
      assert tournament.module == @module
      assert tournament.state == "active"
      assert Tournament.Players.count(tournament) == 8
      assert Tournament.Tasks.count(tournament) == 6

      assert tournament |> get_matches("playing") |> Enum.count() == 4

      assert tournament.current_round == 0
      assert MapSet.size(tournament.played_pair_ids) == 4

      assert Enum.count(get_player(tournament, user_id1).task_ids) == 1

      send_user_win_match(tournament, user1)
      :timer.sleep(100)
      assert [%{state: "game_over", winner_id: ^user_id1}] = get_matches(tournament, "game_over")
      assert Enum.count(get_player(tournament, user_id1).task_ids) == 2

      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      assert Enum.count(get_matches(tournament, "game_over")) == 2
      assert Enum.count(get_player(tournament, user_id1).task_ids) == 3

      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      assert Enum.count(get_matches(tournament, "game_over")) == 3
      assert Enum.count(get_player(tournament, user_id1).task_ids) == 4

      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      assert Enum.count(get_matches(tournament, "game_over")) == 4
      assert Enum.count(get_player(tournament, user_id1).task_ids) == 5

      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      assert Enum.count(get_matches(tournament, "game_over")) == 5
      assert Enum.count(get_player(tournament, user_id1).task_ids) == 6

      send_user_win_match(tournament, user1)
      :timer.sleep(100)

      assert Enum.count(get_matches(tournament, "game_over")) == 6
      assert Enum.count(get_player(tournament, user_id1).task_ids) == 6
      # TODO: add assert_receive message with wait_type round

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(100)
      assert Enum.count(get_player(tournament, user_id1).task_ids) == 1
    end
  end
end
