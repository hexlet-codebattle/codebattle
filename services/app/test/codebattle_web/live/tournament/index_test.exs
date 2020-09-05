defmodule CodebattleWeb.Live.Tournament.IndexTest do
  alias Codebattle.Tournament.Context

  use CodebattleWeb.ConnCase, async: false

  test "create individual tournament", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_submit(view, :create, %{
      "tournament" => %{type: "individual", starts_after_in_minutes: "1", name: "test"}
    })

    assert Enum.count(Context.get_live_tournaments()) == 1
  end

  test "create team tournament", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_submit(view, :create, %{
      "tournament" => %{type: "team", starts_after_in_minutes: "1", name: "test"}
    })

    assert Enum.count(Context.get_live_tournaments()) == 1
  end

  test "validate tournament type", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_change(view, :validate, %{"tournament" => %{name: "a"}})

    render_submit(view, :create, %{
      "tournament" => %{type: "asdf", starts_after_in_minutes: "1", name: "test"}
    })

    assert Codebattle.Repo.count(Codebattle.Tournament) == 0
  end
end
