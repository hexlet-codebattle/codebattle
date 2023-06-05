defmodule Codebattle.Tournament.IndividualTest do
  use Codebattle.IntegrationCase, async: false

  import Codebattle.Tournament.Helpers

  @module Codebattle.Tournament.Individual

  describe "complete players" do
    test "scales to 2 when 1 player" do
      user = insert(:user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 100)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 2
    end

    test "scales to 4 when 3 player" do
      user = insert(:user)
      users = insert_list(2, :user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 100)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 4
    end

    test "scales to 8 when 5 players" do
      user = insert(:user)
      users = insert_list(4, :user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 100)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 8
    end

    test "scales to 16 when 9 players" do
      user = insert(:user)
      users = insert_list(8, :user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 100)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 16
    end

    test "scales to 32 when 18 players" do
      user = insert(:user)
      users = insert_list(17, :user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 100)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 32
    end

    test "scales to 64 when 33 players" do
      user = insert(:user)
      users = insert_list(9, :user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 7)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 8
    end

    test "scales to 128 when 65 players" do
      user = insert(:user)
      users = insert_list(64, :user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 299)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 128
    end

    test "respects players limit" do
      user = insert(:user)
      users = insert_list(10, :user)

      tournament =
        insert(:tournament, state: "waiting_participants", creator_id: user.id, players_limit: 7)

      tournament = @module.join(tournament, %{user: user})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user})

      assert players_count(tournament) == 8
    end
  end

  describe "finish_match/2" do
    test "creates new round after all matches finished" do
      user1 = insert(:user)
      user2 = insert(:user)
      user3 = insert(:user)
      user4 = insert(:user)

      tournament = insert(:tournament, state: "waiting_participants", creator_id: user1.id)

      tournament = @module.join(tournament, %{user: user1})
      tournament = @module.join(tournament, %{user: user2})
      tournament = @module.join(tournament, %{user: user3})
      tournament = @module.join(tournament, %{user: user4})
      tournament = @module.start(tournament, %{user: user1})

      [match1, match2] = get_matches(tournament)

      [id1, id2] = match1.player_ids
      [id3, id4] = match2.player_ids

      tournament =
        @module.finish_match(tournament, %{
          ref: match1.id,
          game_state: "game_over",
          game_level: "elementary",
          player_results: %{
            id1 => %{result: "won", id: id1, duration_sec: 10, result_percent: 100.0},
            id2 => %{result: "lost", id: id2, duration_sec: 15, result_percent: 50.0}
          }
        })

      assert tournament.current_round == 0

      tournament =
        @module.finish_match(tournament, %{
          ref: match2.id,
          game_state: "timeout",
          game_level: "elementary",
          player_results: %{
            id3 => %{result: "timeout", id: id3, duration_sec: nil, result_percent: 0.0},
            id4 => %{result: "timeout", id: id4, duration_sec: 15, result_percent: 10.0}
          }
        })

      assert tournament.current_round == 1
    end
  end
end
