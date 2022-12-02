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
        event: "game:updated",
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

      :ok = Game.Context.trigger_timeout(game_id)

      refute_receive(%{})
    end
  end

  describe "fetch_score_by_game_id/1" do
    test "works" do
      user1 = %{id: user1_id} = insert(:user)
      user2 = %{id: user2_id} = insert(:user)
      players = [Player.build(user1), Player.build(user2)]

      game = %{id: game1_id} = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user1, creator: false, game: game, result: "won")
      insert(:user_game, user: user2, creator: true, game: game, result: "gave_up")
      game = %{id: game2_id} = insert(:game, state: "game_over", players: players)
      insert(:user_game, user: user2, creator: true, game: game, result: "won")
      insert(:user_game, user: user1, creator: false, game: game, result: "lost")
      game = %{id: game3_id} = insert(:game, state: "playing", players: players)
      insert(:user_game, user: user1, creator: false, game: game, result: nil)
      insert(:user_game, user: user2, creator: true, game: game, result: nil)

      assert %{
               opponent_one_id: ^user1_id,
               opponent_two_id: ^user2_id,
               game_results: [
                 %{game_id: ^game1_id, winner_id: ^user1_id, inserted_at: _},
                 %{game_id: ^game2_id, winner_id: ^user2_id, inserted_at: _}
               ]
             } = Game.Context.fetch_score_by_game_id(game3_id)
    end
  end
end
