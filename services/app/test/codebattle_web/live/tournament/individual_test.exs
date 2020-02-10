defmodule CodebattleWeb.Live.Tournament.IndividialTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament.Helpers

  test "integration tournament start test", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    user3 = insert(:user)
    task = insert(:task, level: "elementary")

    playbook_data = %{
      playbook: [
        %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
        %{
          "diff" => %{"delta" => [%{"insert" => "t"}], "time" => 20},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
          "type" => "editor_text",
          "id" => 2
        },
        %{
          "diff" => %{"prev_lang" => "ruby", "next_lang" => "ruby", "time" => 100},
          "type" => "editor_lang",
          "id" => 2
        },
        %{"type" => "game_complete", "id" => 2, "lang" => "ruby"}
      ]
    }

    insert(:playbook, %{data: playbook_data, task: task, winner_lang: "ruby"})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)
    conn3 = put_session(conn, :user_id, user3.id)

    {:ok, view, _html} = live(conn1, Routes.tournament_path(conn1, :index))

    {:error, {:redirect, %{to: "/tournaments/" <> tournament_id}}} =
      render_submit(view, :create, %{
        "tournament" => %{type: "individual", starts_at_type: "1_min", name: "test"}
      })

    tournament = Codebattle.Tournament.get!(tournament_id)

    {:ok, view1, _html} = live(conn1, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view1, :join)

    tournament = Codebattle.Tournament.get!(tournament.id)
    assert Helpers.players_count(tournament) == 1

    render_click(view1, :leave)
    render_click(view1, :leave)

    tournament = Codebattle.Tournament.get!(tournament.id)
    assert Helpers.players_count(tournament) == 0

    render_click(view1, :join)

    {:ok, view2, _html} = live(conn2, Routes.tournament_path(conn, :show, tournament.id))

    render_click(view2, :join)
    render_click(view2, :join)

    tournament = Codebattle.Tournament.get!(tournament.id)
    assert Helpers.players_count(tournament) == 2

    render_click(view2, :start)
    tournament = Codebattle.Tournament.get!(tournament.id)
    assert tournament.state == "waiting_participants"

    render_click(view1, :start)

    tournament = Codebattle.Tournament.get!(tournament.id)
    assert tournament.state == "active"

    assert Enum.count(tournament.data.players) == 16
    assert Enum.count(tournament.data.matches) == 8

    {:ok, view3, _html} = live(conn3, Routes.tournament_path(conn, :show, tournament.id))
    render_click(view3, :join)

    tournament = Codebattle.Tournament.get!(tournament.id)
    assert Helpers.players_count(tournament) == 16
  end
end
