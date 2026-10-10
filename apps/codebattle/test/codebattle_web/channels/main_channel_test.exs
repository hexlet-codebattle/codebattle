defmodule CodebattleWeb.MainChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Game
  alias CodebattleWeb.MainChannel
  alias CodebattleWeb.Presence
  alias CodebattleWeb.UserSocket
  alias Phoenix.Socket.Message
  alias Phoenix.Socket.Reply

  setup do
    creator = insert(:user)
    recipient = insert(:user)

    creator_token = user_socket_token(creator)
    recipient_token = user_socket_token(recipient)
    {:ok, creator_socket} = connect(UserSocket, %{"token" => creator_token})
    {:ok, recipient_socket} = connect(UserSocket, %{"token" => recipient_token})

    {:ok,
     %{
       creator: creator,
       creator_socket: creator_socket,
       recipient: recipient,
       recipient_socket: recipient_socket
     }}
  end

  test "on connect pushes presence state", %{creator_socket: creator_socket} do
    {:ok, response, socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{state: "lobby"})

    assert response == %{active_game_id: nil}

    list = Presence.list(socket)

    assert_receive %Message{
      topic: "main",
      event: "presence_state",
      payload: payload
    }

    assert list == payload
  end

  test "sends active_game_id on join", %{creator_socket: creator_socket} do
    user = insert(:user)

    {:ok, response, _socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{
        state: "lobby",
        follow_id: user.id
      })

    assert response == %{active_game_id: nil}

    game = start_live_game(user)

    {:ok, response, _socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{
        state: "lobby",
        follow_id: user.id
      })

    assert response == %{active_game_id: game.id}
  end

  test "follow unfollow", %{creator_socket: creator_socket} do
    user = insert(:user)
    game = start_live_game(user)
    game_id = game.id

    {:ok, response, socket} =
      subscribe_and_join(creator_socket, MainChannel, "main", %{
        state: "lobby"
      })

    assert response == %{active_game_id: nil}

    push(socket, "user:follow", %{user_id: user.id + 100_000})

    assert_receive %Reply{
      topic: "main",
      payload: %{active_game_id: nil}
    }

    push(socket, "user:follow", %{user_id: user.id})

    assert_receive %Reply{
      topic: "main",
      payload: %{active_game_id: ^game_id}
    }

    Game.Context.terminate_game(game_id)
    Game.Context.create_game(%{players: [user]})
    :timer.sleep(100)

    assert_receive %Message{
      topic: "main",
      event: "user:game_created",
      payload: %{active_game_id: _}
    }

    push(socket, "user:unfollow", %{user_id: user.id})

    assert_receive %Reply{
      topic: "main",
      payload: %{}
    }

    Game.Context.create_game(%{players: [user]})
    :timer.sleep(100)

    refute_receive %Message{
      topic: "main",
      event: "user:game_created",
      payload: %{active_game_id: _}
    }
  end

  describe "presence_link/1" do
    test "keeps public games and tournaments, drops hidden games and junk" do
      public_game = insert(:game, state: "playing", visibility_type: "public")
      hidden_game = insert(:game, state: "playing", visibility_type: "hidden")

      assert MainChannel.presence_link("/games/#{public_game.id}") == "/games/#{public_game.id}"
      assert MainChannel.presence_link("/games/#{hidden_game.id}") == nil
      assert MainChannel.presence_link("/tournaments/42") == "/tournaments/42"
      assert MainChannel.presence_link("javascript:alert(1)") == nil
      assert MainChannel.presence_link(nil) == nil
    end
  end

  # get_active_game_id only returns games with a live process
  defp start_live_game(user) do
    insert(:task, level: "easy")
    {:ok, game} = Game.Context.create_game(%{state: "playing", players: [user, insert(:user)], level: "easy"})
    on_exit(fn -> Game.GlobalSupervisor.terminate_game(game.id) end)
    game
  end
end
