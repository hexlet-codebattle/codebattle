defmodule CodebattleWeb.Live.Tournament.IndividualTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament.Helpers

  test "integration tournament start test", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    user3 = insert(:user)
    insert(:task, level: "elementary")

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)
    conn3 = put_session(conn, :user_id, user3.id)

    {:ok, view, _html} = live(conn1, Routes.tournament_path(conn1, :index))

    {:error, {:redirect, %{to: "/tournaments/" <> tournament_id}}} =
      render_submit(view, :create, %{
        "tournament" => %{type: "individual", starts_at: "2021-09-01 08:30", name: "test"}
      })

    tournament = Codebattle.Tournament.Context.get!(tournament_id)

    {:ok, view1, _html} = live(conn1, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view1, :join)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 1

    render_click(view1, :leave)
    render_click(view1, :leave)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 0

    render_click(view1, :join)

    {:ok, view2, _html} = live(conn2, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view2, :join)
    render_click(view2, :join)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 2

    render_click(view2, :start)
    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert tournament.state == "waiting_participants"

    render_click(view1, :start)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert tournament.state == "active"

    assert Enum.count(tournament.players) == 2
    assert Enum.count(tournament.matches) == 1

    {:ok, view3, _html} = live(conn3, Routes.tournament_path(conn, :show, tournament.id))
    render_click(view3, :join)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 2
  end
end
