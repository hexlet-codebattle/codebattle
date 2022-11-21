defmodule CodebattleWeb.LobbyChannelTest do
  use CodebattleWeb.ChannelCase

  import ExUnit.CaptureIO

  alias CodebattleWeb.LobbyChannel
  alias CodebattleWeb.UserSocket
  alias Codebattle.Game

  test "sends game info when user join" do
    task = insert(:task)
    game = insert(:game, task: task, level: task.level, state: "game_over")
    insert(:tournament, %{state: "active"})
    user = insert(:user)
    insert(:user_game, user: user, creator: false, game: game, result: "won")
    insert(:user_game, user: user, creator: true, game: game, result: "gave_up")

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})

    {:ok, %{winner: user, socket: socket, task: task}}

    game_params = %{players: [%Game.Player{id: user.id}], task: task}
    {:ok, _game} = Game.Context.create_game(game_params)

    {:ok,
     %{
       active_games: active_games,
       tournaments: tournaments,
       completed_games: completed_games
     }, _socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    assert active_games
    assert tournaments
    assert completed_games
  end

  test "creates game with other users" do
    user = insert(:user)
    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})

    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    push(socket, "game:create", %{opponent_type: "other_user", level: "elementary"})

    assert_receive %Phoenix.Socket.Message{
      event: "game:upsert"
    }
  end

  test "creates game with bot" do
    user = insert(:user)
    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})

    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    push(socket, "game:create", %{opponent_type: "bot", level: "elementary"})

    assert_receive %Phoenix.Socket.Message{
      event: "game:upsert"
    }
  end

  test "creates game with task" do
    user1 = insert(:user)
    user2 = insert(:user)

    task1 =
      insert(:task,
        level: "elementary",
        creator_id: user1.id,
        visibility: "hidden",
        state: "disabled",
        name: "1"
      )

    insert(:task, level: "elementary", name: "2")

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user1.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})
    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    push(socket, "game:create", %{
      opponent_type: "whatever",
      level: "elementary",
      task_id: task1.id
    })

    assert_receive %Phoenix.Socket.Message{
      event: "game:upsert",
      payload: %{game: %{id: game_id}}
    }

    {:ok, game} = Game.Context.get_game(game_id)
    assert game.task.name == "1"

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user2.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})
    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    capture_io(&:c.flush/0)

    push(socket, "game:create", %{
      level: "elementary",
      opponent_type: "whatever",
      task_id: task1.id
    })

    assert_receive %Phoenix.Socket.Message{
      event: "game:upsert",
      payload: %{game: %{id: game_id}}
    }

    {:ok, game} = Game.Context.get_game(game_id)
    assert game.task.name == "2"
  end

  test "creates game with task_tags" do
    user1 = insert(:user)
    user2 = insert(:user)
    user3 = insert(:user)

    insert(:task,
      level: "elementary",
      creator_id: user1.id,
      visibility: "hidden",
      state: "disabled",
      tags: ["lol"],
      name: "1"
    )

    insert(:task, level: "elementary", name: "2")

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user1.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})
    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    push(socket, "game:create", %{
      opponent_type: "whatever",
      level: "elementary",
      task_id: nil,
      task_tags: ["lol"]
    })

    assert_receive %Phoenix.Socket.Message{
      event: "game:upsert",
      payload: %{game: %{id: game_id}}
    }

    {:ok, game} = Game.Context.get_game(game_id)
    assert game.task.name == "1"

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user2.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})
    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    capture_io(&:c.flush/0)

    push(socket, "game:create", %{
      level: "elementary",
      opponent_type: "whatever",
      task_tags: ["lol"]
    })

    assert_receive %Phoenix.Socket.Message{
      event: "game:upsert",
      payload: %{game: %{id: game_id}}
    }

    {:ok, game} = Game.Context.get_game(game_id)
    assert game.task.name == "2"

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user3.id)
    {:ok, socket} = connect(UserSocket, %{"token" => user_token})
    {:ok, _payload, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")

    capture_io(&:c.flush/0)

    push(socket, "game:create", %{
      level: "elementary",
      opponent_type: "whatever",
      task_tags: ["kek"]
    })

    assert_receive %Phoenix.Socket.Message{
      event: "game:upsert",
      payload: %{game: %{id: game_id}}
    }

    {:ok, game} = Game.Context.get_game(game_id)
    assert game.task.name == "2"
  end
end
