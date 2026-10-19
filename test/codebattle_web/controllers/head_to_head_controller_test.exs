defmodule CodebattleWeb.HeadToHeadControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Game.Player

  setup do
    first = insert(:user, name: "First <Player>")
    second = insert(:user, name: "Second Player")
    {:ok, first: first, second: second}
  end

  test "answers Telegram with the head-to-head card without logging in", %{conn: conn, first: first, second: second} do
    html =
      conn
      |> put_req_header("user-agent", "TelegramBot (like TwitterBot)")
      |> get(Routes.head_to_head_path(conn, :show, first.id, second.id))
      |> html_response(200)

    assert html =~ "First &lt;Player&gt; vs Second Player"
    assert html =~ "First &lt;Player&gt; 0 : 0 Second Player"

    assert html =~
             ~s(content="#{Routes.head_to_head_image_url(CodebattleWeb.Endpoint, :show, first.id, second.id)}" property="og:image")

    assert html =~
             ~s(content="#{Routes.head_to_head_url(CodebattleWeb.Endpoint, :show, first.id, second.id)}" property="og:url")

    assert html =~ ~s(content="1200" property="og:image:width")
    assert html =~ ~s(content="630" property="og:image:height")
    assert html =~ "<body></body>"
  end

  test "keeps authentication for guest browsers", %{conn: conn, first: first, second: second} do
    conn = get(conn, Routes.head_to_head_path(conn, :show, first.id, second.id))

    assert redirected_to(conn) =~ Routes.session_path(conn, :new)
  end

  test "includes the card in the signed-in page", %{conn: conn, first: first, second: second} do
    html =
      conn
      |> log_in_user(first.id)
      |> get(Routes.head_to_head_path(conn, :show, first.id, second.id))
      |> html_response(200)

    assert html =~
             ~s(content="#{Routes.head_to_head_image_url(CodebattleWeb.Endpoint, :show, first.id, second.id)}" property="og:image")
  end

  test "renders an empty history with escaped names", %{conn: conn, first: first, second: second} do
    image = conn |> get(Routes.head_to_head_image_path(conn, :show, first.id, second.id)) |> response(200)

    assert image =~ "First &lt;Player&gt;"
    assert image =~ "Second Player"
    assert image =~ "0 : 0"
    assert image =~ "Games: 0"
    assert image =~ "Draws: 0"
    refute image =~ ~s(class="side leader")
  end

  test "refreshes the score after a result and preserves the requested player order", %{
    conn: conn,
    first: first,
    second: second
  } do
    path = Routes.head_to_head_image_path(conn, :show, first.id, second.id)
    assert conn |> get(path) |> response(200) =~ "0 : 0"

    game = insert(:game, state: "game_over", players: [Player.build(first), Player.build(second)])
    insert(:user_game, game: game, user: first, result: "won")
    insert(:user_game, game: game, user: second, result: "lost")

    image = conn |> get(path) |> response(200)
    assert image =~ "1 : 0"
    assert image =~ "Games: 1"
    assert image =~ ~s(class="side leader")

    reverse = conn |> get(Routes.head_to_head_image_path(conn, :show, second.id, first.id)) |> response(200)
    assert reverse =~ "0 : 1"
  end
end
