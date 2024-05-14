defmodule CodebattleWeb.Integration.ForbidMultipleGamesTest do
  use Codebattle.IntegrationCase

  test "User cannot create second game", %{conn: conn} do
    insert(:task)
    user = insert(:user)
    socket = socket(UserSocket, "user_id", %{current_user: user})

    conn
    |> put_session(:user_id, user.id)
    |> get(user_path(conn, :index))

    {:ok, _response, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")
    ref = Phoenix.ChannelTest.push(socket, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :ok, %{game_id: _game_id})

    {:ok, _response, socket} = subscribe_and_join(socket, LobbyChannel, "lobby")
    ref = Phoenix.ChannelTest.push(socket, "game:create", %{level: "easy"})
    Phoenix.ChannelTest.assert_reply(ref, :error, %{reason: :already_in_a_game})

    assert Repo.count(Game) == 1
  end
end
