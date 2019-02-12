defmodule RecalculateAchivementsTest do
  use Codebattle.IntegrationCase

  import Mock
  import CodebattleWeb.Factory

  alias Codebattle.GameProcess.Server
  alias CodebattleWeb.UserSocket
  alias Codebattle.User

  setup %{conn: conn} do
    insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok, %{conn1: conn1, conn2: conn2, socket1: socket1, socket2: socket2, user1: user1, user2: user2}}
  end
  test "calculate new achievement", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2,
    user1: user1,
    user2: user2
  } do
    with_mocks [
      {Codebattle.CodeCheck.Checker, [], [check: fn _a, _b, _c -> {:ok, "asdf", "asdf"} end]}
    ]
    do
    insert_list(9, :user_game, %{user: user1})
    # Create game
    conn =
      conn1
      |> get(page_path(conn1, :index))
      |> post(game_path(conn1, :create, level: "easy"))

    game_id = game_id_from_conn(conn)

    game_topic = "game:" <> to_string(game_id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # Second player join game
    post(conn2, game_path(conn2, :join, game_id))
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    # First player won
    editor_text1 = "Hello world1!"
    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: editor_text1, lang: "js"})
    :timer.sleep(100)
    fsm = Server.fsm(game_id)
    user = Repo.get(User, user1.id)
    assert user.achievements == ["played_ten_games"]
  end

end
end