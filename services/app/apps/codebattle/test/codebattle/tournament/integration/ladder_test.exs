defmodule Codebattle.Tournament.Integration.LadderTest do
  use Codebattle.IntegrationCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Player

  @module Codebattle.Tournament.Ladder

  setup do
    insert_list(20, :task, level: "easy")
    user = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Ladder",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => user,
        "break_duration_seconds" => 0,
        "type" => "ladder",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    %{user: user, tournament: tournament}
  end

  describe "Full tournament" do
    test "works", %{user: user, tournament: tournament} do
      users = insert_list(399, :user)
      [user1 = %{id: user_id1} | _] = users

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament.is_live
      assert tournament.module == @module
      assert tournament.state == "active"
      assert tournament.level == "easy"
      assert Enum.count(tournament.players) == 200

      assert tournament |> get_matches("playing") |> Enum.count() == 100

      assert tournament.current_round == 0

      send_user_win_match(tournament, user1)
      :timer.sleep(150)

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
      :timer.sleep(50)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament |> get_matches("game_over") |> Enum.count() == 1
      assert tournament |> get_matches("timeout") |> Enum.count() == 99
      assert tournament |> get_matches("playing") |> Enum.count() == 50
      assert Enum.count(tournament.players) == 200
      assert tournament.current_round == 1

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

      assert tournament |> get_matches("game_over") |> Enum.count() == 2
      assert tournament |> get_matches("timeout") |> Enum.count() == 99
      assert tournament |> get_matches("playing") |> Enum.count() == 49
      assert tournament.current_round == 1

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(50)
      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament |> get_matches("game_over") |> Enum.count() == 2
      assert tournament |> get_matches("timeout") |> Enum.count() == 148
      assert tournament |> get_matches("playing") |> Enum.count() == 25
      assert tournament.current_round == 2

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(50)

      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament.state == "finished"
      assert tournament |> get_matches("game_over") |> Enum.count() == 2
      assert tournament |> get_matches("timeout") |> Enum.count() == 173
      assert tournament |> get_matches("playing") |> Enum.count() == 0
      assert tournament.current_round == 2
    end

    test "works with with an odd number of users", %{user: user, tournament: tournament} do
      users = insert_list(12, :user)
      [user1 = %{id: user_id1} | _] = users

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament.is_live
      assert tournament.module == @module
      assert tournament.state == "active"
      assert tournament.level == "easy"
      assert Enum.count(tournament.players) == 14

      assert tournament |> get_matches("playing") |> Enum.count() == 7

      assert tournament.current_round == 0

      send_user_win_match(tournament, user1)
      :timer.sleep(150)

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
      :timer.sleep(50)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament |> get_matches("game_over") |> Enum.count() == 1
      assert tournament |> get_matches("timeout") |> Enum.count() == 6
      assert tournament |> get_matches("playing") |> Enum.count() == 4
      assert tournament.current_round == 1

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

      assert tournament |> get_matches("game_over") |> Enum.count() == 2
      assert tournament |> get_matches("timeout") |> Enum.count() == 6
      assert tournament |> get_matches("playing") |> Enum.count() == 3
      assert tournament.current_round == 1

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(50)
      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament |> get_matches("game_over") |> Enum.count() == 2
      assert tournament |> get_matches("timeout") |> Enum.count() == 9
      assert tournament |> get_matches("playing") |> Enum.count() == 2
      assert tournament.current_round == 2

      Tournament.Server.finish_round_after(tournament.id, tournament.current_round, 0)
      :timer.sleep(50)

      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament.state == "finished"
      assert tournament |> get_matches("game_over") |> Enum.count() == 2
      assert tournament |> get_matches("timeout") |> Enum.count() == 11
      assert tournament |> get_matches("playing") |> Enum.count() == 0
      assert tournament.current_round == 2
    end
  end
end
