defmodule Codebattle.Tournament.Integration.SwissTest do
  use Codebattle.IntegrationCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Player
  @module Codebattle.Tournament.Swiss

  setup do
    insert_list(20, :task, level: "easy")
    user = insert(:user)
    users = insert_list(199, :user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Swiss",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => user,
        "break_duration_seconds" => 0,
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

      Tournament.Server.send_event(tournament.id, :join, %{user: user})
      Tournament.Server.send_event(tournament.id, :join, %{users: users})
      Tournament.Server.send_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament.is_live
      assert tournament.module == @module
      assert tournament.state == "active"
      assert tournament.level == "easy"
      assert Enum.count(tournament.players) == 200

      assert tournament |> get_matches("playing") |> Enum.count() == 100

      assert tournament.current_round == 0
      assert MapSet.size(tournament.played_pair_ids) == 100

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

      assert %Player{score: 4, wins_count: 0} = tournament |> get_player(opponent_id)
      assert %Player{score: 12, wins_count: 1} = tournament |> get_player(user_id1)

      Tournament.Server.finish_round_after(tournament.id, 0)
      :timer.sleep(50)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert tournament |> get_matches("game_over") |> Enum.count() == 1
      assert tournament |> get_matches("timeout") |> Enum.count() == 100
      assert tournament |> get_matches("playing") |> Enum.count() == 100
      assert Enum.count(tournament.players) == 200
      assert MapSet.size(tournament.played_pair_ids) == 200
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

      assert %Player{score: 4, wins_count: 0} = tournament |> get_player(opponent_id)
      assert %Player{score: 24, wins_count: 2} = tournament |> get_player(user_id1)

      tournament = Tournament.Server.get_tournament(tournament.id)
      send_user_win_match(tournament, user1)
      :timer.sleep(50)
      tournament = Tournament.Server.get_tournament(tournament.id)
      send_user_win_match(tournament, user1)
      :timer.sleep(50)
      tournament = Tournament.Server.get_tournament(tournament.id)
      send_user_win_match(tournament, user1)
      :timer.sleep(50)

      tournament = Tournament.Server.get_tournament(tournament.id)

      assert %Player{score: 16, wins_count: 0} = tournament |> get_player(opponent_id)
      assert %Player{score: 60, wins_count: 5} = tournament |> get_player(user_id1)

      assert tournament |> get_matches("game_over") |> Enum.count() == 5
      assert tournament |> get_matches("timeout") |> Enum.count() == 100
      assert tournament |> get_matches("playing") |> Enum.count() == 100
      assert MapSet.size(tournament.played_pair_ids) == 200
      assert tournament.current_round == 1

      Tournament.Server.finish_round_after(tournament.id, 0)
      :timer.sleep(50)
      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament |> get_matches("game_over") |> Enum.count() == 5
      assert tournament |> get_matches("timeout") |> Enum.count() == 200
      assert tournament |> get_matches("playing") |> Enum.count() == 100
      assert MapSet.size(tournament.played_pair_ids) == 300
      assert tournament.current_round == 2

      Tournament.Server.finish_round_after(tournament.id, 0)
      :timer.sleep(50)

      tournament = Tournament.Server.get_tournament(tournament.id)
      assert tournament.state == "finished"
      assert tournament |> get_matches("game_over") |> Enum.count() == 5
      assert tournament |> get_matches("timeout") |> Enum.count() == 300
      assert tournament |> get_matches("playing") |> Enum.count() == 0
      assert MapSet.size(tournament.played_pair_ids) == 300
      assert tournament.current_round == 2
    end
  end
end
