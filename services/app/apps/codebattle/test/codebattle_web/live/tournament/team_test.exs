defmodule CodebattleWeb.Live.Tournament.TeamTest do
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
        "tournament" => %{
          type: "team",
          starts_at:
            DateTime.utc_now()
            |> Timex.shift(minutes: 30)
            |> Timex.format!("%Y-%m-%d %H:%M", :strftime),
          team_1_name: "Elixir",
          team_2_name: "",
          match_timeout_seconds: "140",
          name: "test"
        }
      })

    tournament = Codebattle.Tournament.Context.get!(tournament_id)

    assert tournament.meta == %{
             teams: %{
               "0": %{id: 0, title: "Elixir", score: 0.0},
               "1": %{id: 1, title: "Frontend", score: 0.0}
             },
             round_results: %{},
             rounds_to_win: 3
           }

    assert tournament.match_timeout_seconds == 140

    {:ok, view1, _html} = live(conn1, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view1, :join, %{"team_id" => "0"})
    render_click(view1, :join, %{"team_id" => "1"})

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 1

    {:ok, view2, _html} = live(conn2, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view2, :leave, %{"team_id" => "0"})
    render_click(view2, :leave, %{"team_id" => "1"})
    render_click(view2, :join, %{"team_id" => "1"})

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 2

    {:ok, view3, _html} = live(conn3, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view3, :join, %{"team_id" => "0"})

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 3

    render_click(view1, :start)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)

    assert tournament.state == "active"
    assert Helpers.players_count(tournament) == 4
    assert Enum.count(tournament.matches) == 2
  end
end
