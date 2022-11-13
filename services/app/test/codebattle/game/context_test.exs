defmodule Codebattle.Game.ContextTest do
  use Codebattle.DataCase

  setup do
    user1 = insert(:user, rating: 1001)
    user2 = insert(:user, rating: 1002)
    task = insert(:task)
    Codebattle.PubSub.subscribe("games")

    {:ok, %{user1: user1, user2: user2, task: task}}
  end

  describe "trigger_timeout/1" do
    test "changes state and broadcasts events", %{user1: user1, user2: user2} do
      {:ok, %{id: game_id, players: [%{id: user1_id}, %{id: user2_id }]}} =
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
        payload: %{game_id: ^game_id, game_state: "timeout", game: %{id: ^game_id, players: [%{id: ^user1_id}, %{id: ^user2_id}], state: "timeout"}}
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
end
