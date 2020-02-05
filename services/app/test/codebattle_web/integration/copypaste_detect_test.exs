defmodule Codebattle.CopyPasteDetectTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.UserSocket

  setup %{conn: conn} do
    insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})

    {:ok,
     %{
       conn1: conn1,
       conn2: conn2,
       socket1: socket1,
       socket2: socket2,
       user1: user1,
       user2: user2
     }}
  end

  test "Detect user copypaste", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2
  } do
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
    {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

    # First player copypaste detected
    editor_text = "t"
    editor_text1 = "the whole solution"

    play_books_count = Codebattle.Repo.aggregate(Codebattle.Bot.Playbook, :count, :id)

    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text})
    :timer.sleep(50)
    Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text1})
    Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: editor_text1, lang: "js"})
    :timer.sleep(100)

    assert Codebattle.Repo.aggregate(Codebattle.Bot.Playbook, :count, :id) == play_books_count
  end

  # test "Detect user copypaste, part 2", %{
  #   conn1: conn1,
  #   conn2: conn2,
  #   socket1: socket1,
  #   socket2: socket2
  # } do
  #   # Create game
  #   conn =
  #     conn1
  #     |> get(page_path(conn1, :index))
  #     |> post(game_path(conn1, :create, level: "easy"))

  #   game_id = game_id_from_conn(conn)

  #   game_topic = "game:" <> to_string(game_id)
  #   {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

  #   # Second player join game
  #   post(conn2, game_path(conn2, :join, game_id))
  #   {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
  #   template = "def solution(a, b) return"
  #   editor_text1 = "def solution(a, b) the  return"
  #   editor_text2 = "def solution(a, b) the whole so  return"
  #   solution = "def solution(a, b) the whole solution  return"

  #   play_books_count = Codebattle.Repo.aggregate(Codebattle.Bot.Playbook, :count, :id)

  #   Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: template})
  #   :timer.sleep(50)
  #   Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text1})
  #   Phoenix.ChannelTest.push(socket1, "editor:data", %{editor_text: editor_text2})
  #   Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: solution, lang: "js"})
  #   :timer.sleep(1000)

  #   assert Codebattle.Repo.aggregate(Codebattle.Bot.Playbook, :count, :id) ==
  #            play_books_count + 1
  # end
end
