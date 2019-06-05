defmodule Codebattle.UserAchivementsTest do
  use Codebattle.IntegrationCase

  alias Codebattle.{Repo, Game}
  alias CodebattleWeb.UserSocket

  import Mock
  import Ecto.Query

  setup %{conn: conn} do
    1..5
    |> Enum.each(fn _x ->
      insert(:task, level: "easy", name: Base.encode32(:crypto.strong_rand_bytes(10)))
    end)

    insert(:task, level: "medium", name: Base.encode32(:crypto.strong_rand_bytes(10)))

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

  test "Select random task", %{
    conn1: conn1,
    conn2: conn2,
    socket1: socket1,
    socket2: socket2
  } do
    with_mocks [
      {Codebattle.CodeCheck.Checker, [], [check: fn _a, _b, _c -> {:ok, "asdf", "asdf"} end]}
    ] do
      # Create game

      1..20
      |> Enum.each(fn _x ->
        conn =
          conn1
          |> get(page_path(conn1, :index))
          |> post(game_path(conn1, :create, level: "easy", lang: "js"))

        game_id = game_id_from_conn(conn)

        game_topic = "game:" <> to_string(game_id)
        {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

        # Second player join game
        post(conn2, game_path(conn2, :join, game_id))
        {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)

        # First player won

        editor_text1 = "Hello world1!"

        Phoenix.ChannelTest.push(socket1, "check_result", %{editor_text: editor_text1, lang: "js"})

        :timer.sleep(100)
      end)

      query = from(g in Game, select: g.task_id)
      task_ids = Repo.all(query)

      played_id_list =
        Enum.group_by(task_ids, fn x -> x end)
        |> Map.values()
        |> Enum.map(&Enum.count/1)

      assert 4 == played_id_list |> List.first()
    end
  end
end
