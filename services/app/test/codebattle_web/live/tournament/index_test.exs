defmodule CodebattleWeb.Live.Tournament.IndexTest do
  use CodebattleWeb.ConnCase

  test "create individual tournament", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_submit(view, :create, %{
      "tournament" => %{type: "individual", starts_at_type: "1_min", name: "test"}
    })

    assert Codebattle.Repo.count(Codebattle.Tournament) == 1
  end

  test "create team tournament", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_submit(view, :create, %{
      "tournament" => %{type: "team", starts_at_type: "1_min", name: "test"}
    })

    assert Codebattle.Repo.count(Codebattle.Tournament) == 1
  end

  test "validate tournament type", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_change(view, :validate, %{"tournament" => %{name: "a"}})

    render_submit(view, :create, %{
      "tournament" => %{type: "asdf", starts_at_type: "1_min", name: "test"}
    })

    assert Codebattle.Repo.count(Codebattle.Tournament) == 0
  end
end
