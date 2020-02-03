defmodule CodebattleWeb.Live.Tournament.TeamTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament.Helpers

  @db_insert_timeout 100

  test "integration tournament start test", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    user3 = insert(:user)
    task = insert(:task, level: "elementary")

    playbook_data = %{
      playbook: [
        %{"delta" => [%{"insert" => "t"}], "time" => 20},
        %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
        %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
        %{"lang" => "ruby", "time" => 100}
      ]
    }

    insert(:bot_playbook, %{data: playbook_data, task: task, lang: "ruby"})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)
    conn3 = put_session(conn, :user_id, user3.id)

    {:ok, view, _html} = live(conn1, Routes.tournament_path(conn1, :index))

    {:error, {:redirect, %{to: "/tournaments/" <> tournament_id}}} =
      render_submit(view, :create, %{
        "tournament" => %{type: "team", starts_at_type: "1_min", name: "test"}
      })

    tournament = Codebattle.Tournament.get!(tournament_id)

    {:ok, view1, _html} = live(conn1, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view1, :join, %{"team_id" => "0"})
    render_click(view1, :join, %{"team_id" => "1"})

    :timer.sleep(@db_insert_timeout)
    tournament = Codebattle.Tournament.get!(tournament.id)
    assert Helpers.players_count(tournament) == 1

    {:ok, view2, _html} = live(conn2, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view2, :leave, %{"team_id" => "0"})
    render_click(view2, :leave, %{"team_id" => "1"})
    render_click(view2, :join, %{"team_id" => "1"})

    tournament = Codebattle.Tournament.get!(tournament.id)
    assert Helpers.players_count(tournament) == 2

    {:ok, view3, _html} = live(conn3, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view3, :join, %{"team_id" => "0"})

    tournament = Codebattle.Tournament.get!(tournament.id)
    assert Helpers.players_count(tournament) == 3

    render_click(view1, :start)

    :timer.sleep(@db_insert_timeout)
    tournament = Codebattle.Tournament.get!(tournament.id)
    assert tournament.state == "active"
    assert Helpers.players_count(tournament) == 4
    assert Enum.count(tournament.data.matches) == 2
  end
end
