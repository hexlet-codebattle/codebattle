defmodule CodebattleWeb.Live.Tournament.IndexTest do
  alias Codebattle.Tournament.Context
  alias Codebattle.Tournament

  use CodebattleWeb.ConnCase, async: false

  test "create individual tournament", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_submit(view, :create, %{
      "tournament" => %{type: "individual", starts_at: start_date_time(), name: "test"}
    })

    assert Codebattle.Repo.count(Tournament) == 1
    assert Enum.count(Context.get_live_tournaments()) >= 1
  end

  test "create team tournament", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> put_session(:user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_submit(view, :create, %{
      "tournament" => %{type: "team", starts_at: start_date_time(), name: "test"}
    })

    assert Codebattle.Repo.count(Tournament) == 1
    assert Enum.count(Context.get_live_tournaments()) >= 1
  end

  test "validates tournament type", %{conn: conn} do
    user = insert(:user)

    conn = put_session(conn, :user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_change(view, :validate, %{"tournament" => %{name: "a"}})

    render_submit(view, :create, %{
      "tournament" => %{type: "asdf", starts_at: start_date_time(), name: "test"}
    })

    assert Codebattle.Repo.count(Codebattle.Tournament) == 0
  end

  test "creates tournament with access_type", %{conn: conn} do
    user = insert(:user)

    conn = put_session(conn, :user_id, user.id)

    {:ok, view, _html} = live(conn, Routes.tournament_path(conn, :index))

    render_submit(view, :create, %{
      "tournament" => %{access_type: "token", starts_at: start_date_time(), name: "test"}
    })

    created = Codebattle.Repo.one(Codebattle.Tournament)
    assert created.access_type == "token"
    assert is_binary(created.access_token)
    assert String.length(created.access_token) > 7
  end

  defp start_date_time() do
    DateTime.utc_now() |> Timex.shift(minutes: 30) |> Timex.format!("%Y-%m-%d %H:%M", :strftime)
  end
end
