defmodule CodebattleWeb.Live.Tournament.StairwayTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament.Helpers

  test "integration tournament start test", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    user3 = insert(:user)
    tasks = insert_list(3, :task)
    task_ids = tasks |> Enum.map(& &1.id)
    task_pack = insert(:task_pack, task_ids: task_ids)

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)
    conn3 = put_session(conn, :user_id, user3.id)

    {:ok, view, _html} = live(conn1, Routes.tournament_path(conn1, :index))

    {:error, {:redirect, %{to: "/tournaments/" <> tournament_id}}} =
      render_submit(view, :create, %{
        "tournament" => %{
          type: "stairway",
          starts_at: "2021-09-01 08:30",
          task_pack_id: to_string(task_pack.id),
          match_timeout_seconds: "140",
          name: "Stairway arena"
        }
      })

    tournament = Codebattle.Tournament.Context.get!(tournament_id)
    assert tournament.task_pack == task_pack

    {:ok, view1, _html} = live(conn1, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view1, :join, %{})
    render_click(view1, :start)
    render_click(view1, :join, %{})

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 1

    {:ok, view2, _html} = live(conn2, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view2, :join, %{})

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Helpers.players_count(tournament) == 2

    {:ok, view3, _html} = live(conn3, Routes.tournament_path(conn, :show, tournament.id))

    # render_click(view3, :join, %{"team_id" => "0"})

    # tournament = Codebattle.Tournament.Context.get!(tournament.id)
    # assert Helpers.players_count(tournament) == 3

    # render_click(view1, :start)

    # tournament = Codebattle.Tournament.Context.get!(tournament.id)
    # assert tournament.state == "active"
    # assert Helpers.players_count(tournament) == 4
    # assert Enum.count(tournament.data.matches) == 2
  end
end
