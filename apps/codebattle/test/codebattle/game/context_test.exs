defmodule Codebattle.Game.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.Game.GlobalSupervisor
  alias Codebattle.Game.Player
  alias Codebattle.Game.Server
  alias Codebattle.PubSub.Message

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

      assert_received %Message{
        event: "game:created",
        topic: "games",
        payload: _
      }

      game_topic = "game:#{game_id}"
      Codebattle.PubSub.subscribe(game_topic)

      {:ok, _new_game} = Game.Context.trigger_timeout(game_id)

      assert_received %Message{
        event: "game:finished",
        topic: "games",
        payload: %{
          game_id: ^game_id,
          game_state: "timeout",
          game: %{id: ^game_id, players: [%{id: ^user1_id}, %{id: ^user2_id}], state: "timeout"}
        }
      }

      assert_received %Message{
        event: "game:finished",
        topic: ^game_topic,
        payload: %{game_id: ^game_id, game_state: "timeout"}
      }
    end

    test "returns handoff error when game server is frozen", %{user1: user1, user2: user2} do
      {:ok, %{id: game_id}} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert :ok == Server.freeze(game_id)
      assert {:error, :handoff_in_progress} = Game.Context.trigger_timeout(game_id)
      assert :ok == Server.unfreeze(game_id)
    end

    test "preserves player ratings when reloading timed out game from db", %{user1: user1, user2: user2} do
      {:ok, %{id: game_id}} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      assert {:ok, _new_game} = Game.Context.trigger_timeout(game_id)
      assert :ok = GlobalSupervisor.terminate_game(game_id)

      reloaded_game = Game.Context.get_game!(game_id)

      assert Enum.map(reloaded_game.players, & &1.rating) == [user1.rating, user2.rating]
    end
  end

  describe "fetch_head_to_head_by_game_id/1" do
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
               players: [%{id: user1.id, wins: 2}, %{id: user2.id, wins: 1}],
               winner_id: user1.id
             } == Game.Context.fetch_head_to_head_by_game_id(game3.id)
    end
  end
end
