defmodule Codebattle.Game.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.Game.EditorEventBatch
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

  describe "store_editor_summary/4" do
    setup do
      user1 = insert(:user)
      user2 = insert(:user)

      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      {:ok, %{user: user1, game: game}}
    end

    test "persists batch when summary uses camelCase keys (frontend payload)", %{user: user, game: game} do
      summary = %{
        "eventCount" => 5,
        "windowStartOffsetMs" => 100,
        "windowEndOffsetMs" => 900,
        "langSlug" => "elixir",
        "keyEventCount" => 4,
        "printableKeyCount" => 3,
        "charsInserted" => 7
      }

      assert {:ok, %EditorEventBatch{} = batch} =
               Game.Context.store_editor_summary(game.id, user, summary, "elixir")

      assert batch.event_count == 5
      assert batch.window_start_offset_ms == 100
      assert batch.window_end_offset_ms == 900
      assert batch.lang == "elixir"
      assert batch.summary["key_event_count"] == 4
      assert batch.summary["printable_key_count"] == 3
      assert batch.summary["chars_inserted"] == 7
      refute Map.has_key?(batch.summary, "lang_slug")
    end

    test "persists batch when summary uses snake_case keys", %{user: user, game: game} do
      summary = %{
        "event_count" => 2,
        "window_start_offset_ms" => 0,
        "window_end_offset_ms" => 500,
        "lang_slug" => "ruby",
        "key_event_count" => 2
      }

      assert {:ok, %EditorEventBatch{} = batch} =
               Game.Context.store_editor_summary(game.id, user, summary, "ruby")

      assert batch.event_count == 2
      assert batch.summary["key_event_count"] == 2
    end

    test "skips when event_count is zero", %{user: user, game: game} do
      summary = %{"eventCount" => 0, "windowStartOffsetMs" => 0, "windowEndOffsetMs" => 0}

      assert {:ok, :skipped} = Game.Context.store_editor_summary(game.id, user, summary, "elixir")
    end

    test "skips when end offset precedes start offset", %{user: user, game: game} do
      summary = %{"eventCount" => 1, "windowStartOffsetMs" => 500, "windowEndOffsetMs" => 100}

      assert {:ok, :skipped} = Game.Context.store_editor_summary(game.id, user, summary, "elixir")
    end

    test "skips when summary is nil", %{user: user, game: game} do
      assert {:ok, :skipped} = Game.Context.store_editor_summary(game.id, user, nil, "elixir")
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
