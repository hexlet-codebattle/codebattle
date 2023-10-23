defmodule Codebattle.Game.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.Game.Player

  describe "trigger_timeout/1" do
    setup do
      user1 = insert(:user, rating: 1001)
      user2 = insert(:user, rating: 1002)
      task = insert(:task)
      Codebattle.PubSub.subscribe("games")

      {:ok, %{user1: user1, user2: user2, task: task}}
    end

    test "changes state and broadcasts events", %{user1: user1, user2: user2} do
      {:ok, %{id: game_id, players: [%{id: user1_id}, %{id: user2_id}]}} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert_received %Codebattle.PubSub.Message{
        event: "game:created",
        topic: "games",
        payload: _
      }

      game_topic = "game:#{game_id}"
      Codebattle.PubSub.subscribe(game_topic)

      :ok = Game.Context.trigger_timeout(game_id)

      assert_received %Codebattle.PubSub.Message{
        event: "game:finished",
        topic: "games",
        payload: %{
          game_id: ^game_id,
          game_state: "timeout",
          game: %{id: ^game_id, players: [%{id: ^user1_id}, %{id: ^user2_id}], state: "timeout"}
        }
      }

      assert_received %Codebattle.PubSub.Message{
        event: "game:finished",
        topic: ^game_topic,
        payload: %{game_id: ^game_id, game_state: "timeout"}
      }
    end
  end

  describe "fetch_score_by_game_id/1" do
    test "works" do
      user1 = insert(:user)
      user2 = insert(:user)
      players = [Player.build(user1), Player.build(user2)]

      game1 = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user1, creator: false, game: game1, result: "won")
      insert(:user_game, user: user2, creator: true, game: game1, result: "gave_up")
      game2 = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user2, creator: true, game: game2, result: "won")
      insert(:user_game, user: user1, creator: false, game: game2, result: "lost")
      game3 = insert(:game, state: "playing", players: players)
      insert(:user_game, user: user1, creator: false, game: game3, result: nil)
      insert(:user_game, user: user2, creator: true, game: game3, result: nil)
      game4 = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user1, creator: false, game: game4, result: "won")
      insert(:user_game, user: user2, creator: true, game: game4, result: "lost")

      assert %{
               game_results: [
                 %{game_id: game1.id, inserted_at: game1.inserted_at, winner_id: user1.id},
                 %{game_id: game2.id, inserted_at: game2.inserted_at, winner_id: user2.id},
                 %{game_id: game4.id, inserted_at: game4.inserted_at, winner_id: user1.id}
               ],
               player_results: %{to_string(user2.id) => 1, to_string(user1.id) => 2},
               winner_id: user1.id
             } == Game.Context.fetch_score_by_game_id(game3.id)
    end
  end
end
