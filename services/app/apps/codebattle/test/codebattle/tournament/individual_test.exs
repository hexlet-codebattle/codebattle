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

  describe ".update_match" do
    test "match with state timeout" do
      user1 = insert(:user)
      user2 = insert(:user)

      tournament = insert(:tournament, state: "waiting_participants", creator_id: user1.id)

      tournament = @module.join(tournament, %{user: user1})
      tournament = @module.join(tournament, %{user: user2})
      tournament = @module.start(tournament, %{user: user1})

      [match] = get_matches(tournament)

      tournament =
        @module.update_match(tournament, %{
          ref: match.id,
          game_state: "timeout",
          player_results: %{user1.id => "timeout", user2.id => "timeout"}
        })

      assert [%{winner_id: nil, id: 0, state: "timeout"}] = get_matches(tournament)
    end

    test "match with state win" do
      user1 = insert(:user)
      user2 = insert(:user)
      user1_id = user1.id

      tournament = insert(:tournament, state: "waiting_participants", creator_id: user1.id)

      tournament = @module.join(tournament, %{user: user1})
      tournament = @module.join(tournament, %{user: user2})
      tournament = @module.start(tournament, %{user: user1})

      [match] = get_matches(tournament)

      tournament =
        @module.update_match(tournament, %{
          ref: match.id,
          game_state: "game_over",
          player_results: %{user1.id => "won", user2.id => "lost"}
        })

      assert [%{winner_id: ^user1_id, id: 0, state: "game_over"}] = get_matches(tournament)
    end
  end

  describe ".finish_match" do
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
          player_results: %{id1 => "won", id2 => "lost"}
        })

      assert tournament.current_round == 0

      tournament =
        @module.finish_match(tournament, %{
          ref: match2.id,
          game_state: "game_over",
          player_results: %{id3 => "won", id4 => "lost"}
        })

      assert tournament.current_round == 1
    end
  end
end
