defmodule Codebattle.Tournament.IndividualTest do
  use Codebattle.IntegrationCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Tournament

  setup do
    insert(:task, level: "elementary", name: "2")

    :ok
  end

  describe "complete players" do
    test "scales to 2 when 1 player" do
      user = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 2
    end

    test "scales to 4 when 3 player" do
      user = insert(:user)
      users = insert_list(2, :user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 4
    end

    test "scales to 8 when 5 players" do
      user = insert(:user)
      users = insert_list(4, :user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 8
    end

    test "scales to 16 when 9 players" do
      user = insert(:user)
      users = insert_list(8, :user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 16
    end

    test "scales to 32 when 18 players" do
      user = insert(:user)
      users = insert_list(17, :user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 32
    end

    test "limits players" do
      user = insert(:user)
      users = insert_list(9, :user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants",
          "players_limit" => 7
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 8
    end

    test "scales to 128 when 65 players" do
      user = insert(:user)
      users = insert_list(64, :user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants",
          "players_limit" => 200
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user})
      Tournament.Server.handle_event(tournament.id, :join, %{users: users})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 128
    end
  end

  describe "finish_match/2" do
    test "creates new round after all matches finished" do
      user1 = insert(:user)
      user2 = insert(:user)
      user3 = insert(:user)
      user4 = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "elementary",
          "creator" => user1,
          "break_duration_seconds" => 0,
          "type" => "individual",
          "state" => "waiting_participants",
          "players_limit" => 200
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user1})
      Tournament.Server.handle_event(tournament.id, :join, %{user: user2})
      Tournament.Server.handle_event(tournament.id, :join, %{user: user3})
      Tournament.Server.handle_event(tournament.id, :join, %{user: user4})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user1})

      tournament = Tournament.Context.get(tournament.id)

      [match1, match2] = get_matches(tournament)

      [id1, _id2] = match1.player_ids
      [id3, _id4] = match2.player_ids

      player1 = Tournament.Players.get_player(tournament, id1)

      send_user_win_match(tournament, player1)
      tournament = Tournament.Context.get(tournament.id)

      assert tournament.current_round == 0
      assert matches_count(tournament) == 2

      player3 = Tournament.Players.get_player(tournament, id3)
      send_user_win_match(tournament, player3)
      tournament = Tournament.Context.get(tournament.id)

      assert tournament.current_round == 1

      assert matches_count(tournament) == 3

      send_user_win_match(tournament, player1)

      tournament = Tournament.Context.get(tournament.id)

      assert tournament.state == "finished"
    end
  end
end
