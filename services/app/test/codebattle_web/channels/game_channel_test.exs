defmodule CodebattleWeb.GameChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Game
  alias CodebattleWeb.GameChannel
  alias CodebattleWeb.UserSocket

  setup do
    user1 = insert(:user, rating: 1001)
    user2 = insert(:user, rating: 1002)
    insert(:task, level: "easy")

    user_token1 = Phoenix.Token.sign(socket(UserSocket), "user_token", user1.id)
    {:ok, socket1} = connect(UserSocket, %{"token" => user_token1})

    user_token2 = Phoenix.Token.sign(socket(UserSocket), "user_token", user2.id)
    {:ok, socket2} = connect(UserSocket, %{"token" => user_token2})

    {:ok, %{user1: user1, user2: user2, socket1: socket1, socket2: socket2}}
  end

  describe "join/3" do
    test "sends game info", %{user1: user1, socket1: socket1} do
      {:ok, game} =
        Game.Context.create_game(%{state: "waiting_opponent", players: [user1], level: "easy"})

      {:ok, created, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic(game))

      assert created.task.level == "easy"
      assert created.mode == "standard"
      assert created.type == "duo"
    end
  end

  describe "handle_in(editor:data)" do
    test "broadcasts editor:data", %{
      user1: user1,
      user2: user2,
      socket1: socket1,
      socket2: socket2
    } do
      {:ok, game} =
        Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

      game_topic = game_topic(game)
      editor_text1 = "test1"
      editor_text2 = "test2"
      editor_lang1 = "js"
      editor_lang2 = "ruby"

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      Mix.Shell.Process.flush()

      push(socket1, "editor:data", %{editor_text: editor_text1, lang_slug: "js"})
      push(socket2, "editor:data", %{editor_text: editor_text2, lang_slug: "js"})

      push(socket1, "editor:data", %{editor_text: editor_text1, lang_slug: editor_lang1})
      push(socket2, "editor:data", %{editor_text: editor_text2, lang_slug: editor_lang2})

      payload1 = %{user_id: user1.id, editor_text: editor_text1, lang_slug: "js"}
      payload2 = %{user_id: user2.id, editor_text: editor_text2, lang_slug: "js"}
      payload3 = %{user_id: user1.id, editor_text: editor_text1, lang_slug: editor_lang1}
      payload4 = %{user_id: user2.id, editor_text: editor_text2, lang_slug: editor_lang2}

      assert_receive %Phoenix.Socket.Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload1
      }

      assert_receive %Phoenix.Socket.Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload2
      }

      assert_receive %Phoenix.Socket.Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload3
      }

      assert_receive %Phoenix.Socket.Broadcast{
        topic: ^game_topic,
        event: "editor:data",
        payload: ^payload4
      }
    end
  end

  test "on give up opponents win when state playing", %{
    user1: user1,
    user2: user2,
    socket1: socket1,
    socket2: socket2
  } do
    {:ok, game} =
      Game.Context.create_game(%{state: "playing", players: [user1, user2], level: "easy"})

    game_topic = game_topic(game)

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    Mix.Shell.Process.flush()

    push(socket1, "give_up")

    :timer.sleep(100)
    game = Game.Context.get_game!(game.id)

    assert game.state == "game_over"
    assert Game.Helpers.gave_up?(game, user1.id) == true
    assert Game.Helpers.winner?(game, user2.id) == true

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^game_topic,
      event: "user:give_up",
      payload: payload
    }

    assert payload.players == game.players
  end

  defp game_topic(game), do: "game:" <> to_string(game.id)
end
