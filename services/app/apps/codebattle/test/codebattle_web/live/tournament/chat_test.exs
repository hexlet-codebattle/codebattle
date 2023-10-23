defmodule CodebattleWeb.Live.Tournament.ChatTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament.Helpers

  test "integration tournament start test", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)

    {:ok, view, _html} = live(conn1, Routes.live_view_tournament_path(conn1, :index))

    {:error, {:redirect, %{to: "/tournaments/" <> tournament_id}}} =
      render_submit(view, :create, %{
        "tournament" => %{
          type: "individual",
          starts_at:
            DateTime.utc_now()
            |> Timex.shift(minutes: 30)
            |> Timex.format!("%Y-%m-%d %H:%M", :strftime),
          name: "test"
        }
      })

    tournament = Codebattle.Tournament.Context.get!(tournament_id)

    {:ok, view1, _html} =
      live(conn1, Routes.live_view_tournament_path(conn, :show, tournament.id))

    render_click(view1, :join)

    {:ok, view2, _html} =
      live(conn2, Routes.live_view_tournament_path(conn, :show, tournament.id))

    render_click(view2, :join)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 2

    render_click(view1, :start)
    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert tournament.state == "active"

    {:ok, view1, _html} =
      live(conn1, Routes.live_view_tournament_path(conn, :show, tournament.id))

    render_click(view1, :chat_message, %{"message" => %{"text" => "asdf"}})
  end
end
