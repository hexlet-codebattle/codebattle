defmodule Codebattle.Tournament.ArenaTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.WaitingRoom

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  setup do
    tasks = insert_list(3, :task, level: "easy")
    insert(:task_pack, name: "tp", task_ids: Enum.map(tasks, & &1.id))

    :ok
  end

  describe "complete players" do
    test "add bots to complete teams" do
      user1 = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "task_pack_name" => "tp",
          "creator" => user1,
          "break_duration_seconds" => 0,
          "task_strategy" => "sequential",
          "type" => "arena",
          "state" => "waiting_participants",
          "use_clan" => "true",
          "players_limit" => 200
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user1})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user1})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 2

      assert [
               %{
                 duration_sec: nil,
                 finished_at: nil,
                 game_id: _,
                 id: 0,
                 level: "easy",
                 player_ids: [_, _],
                 player_results: %{},
                 round_id: _,
                 round_position: 0,
                 started_at: ~N[2019-01-05 19:11:45],
                 state: "playing",
                 winner_id: nil
               }
             ] = get_matches(tournament)
    end

    test "works with several players and single round" do
      creator = insert(:user)
      user1 = insert(:user, %{clan_id: 1, clan: "1"})
      user2 = insert(:user, %{clan_id: 2, clan: "2"})
      user3 = insert(:user, %{clan_id: 3, clan: "3"})
      user4 = insert(:user, %{clan_id: 4, clan: "4"})
      user5 = insert(:user, %{clan_id: 5, clan: "5"})
      user6 = insert(:user, %{clan_id: 6, clan: "6"})
      user7 = insert(:user, %{clan_id: 7, clan: "7"})
      user8 = insert(:user, %{clan_id: 8, clan: "8"})

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "task_pack_name" => "tp",
          "creator" => creator,
          "break_duration_seconds" => 0,
          "task_strategy" => "sequential",
          "type" => "arena",
          "state" => "waiting_participants",
          "use_clan" => "true",
          "rounds_limit" => "1",
          "players_limit" => 200
        })

      users = [user1, user2, user3, user4, user5, user6, user7, user8]

      Tournament.Server.handle_event(tournament.id, :join, %{users: users})

      Tournament.Server.handle_event(tournament.id, :start, %{
        user: creator,
        time_step_ms: 20_000,
        min_time_sec: 0
      })

      tournament = Tournament.Context.get(tournament.id)
      matches = get_matches(tournament)

      assert players_count(tournament) == 8
      assert Enum.count(matches) == 4

      %{id: player1_id} = player1 = Tournament.Players.get_player(tournament, user1.id)
      player3 = Tournament.Players.get_player(tournament, user3.id)
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:player:#{player1_id}")

      send_user_win_match(tournament, player1)
      send_user_win_match(tournament, player3)
      :timer.sleep(200)

      tournament = Tournament.Context.get(tournament.id)

      %{players: players} = WaitingRoom.get_state(tournament.waiting_room_name)
      assert Enum.count(players) == 4

      %{players: players} = WaitingRoom.match_players(tournament.waiting_room_name)
      assert Enum.empty?(players)

      :timer.sleep(200)
      matches = get_matches(tournament)

      assert Enum.count(matches) == 6

      send_user_win_match(tournament, player1)
      :timer.sleep(200)

      tournament = Tournament.Context.get(tournament.id)
      %{players: players} = WaitingRoom.get_state(tournament.waiting_room_name)
      assert Enum.count(players) == 2
      WaitingRoom.update_state(tournament.waiting_room_name, %{min_time_with_played_sec: 0})

      %{players: players} = WaitingRoom.match_players(tournament.waiting_room_name)
      assert Enum.empty?(players)
      :timer.sleep(200)
      send_user_win_match(tournament, player1)
      :timer.sleep(200)

      matches = get_matches(tournament)

      assert Enum.count(matches) == 7

      assert_received %Codebattle.PubSub.Message{
        event: "tournament:player:updated",
        payload: %{player: %{id: ^player1_id, state: "in_waiting_room_active"}}
      }

      assert tournament.current_round_position == 0
      Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)

      :timer.sleep(200)

      tournament = Tournament.Context.get(tournament.id)

      assert tournament.current_round_position == 0
      matches = get_matches(tournament)

      assert Enum.count(matches) == 7
    end
  end
end
