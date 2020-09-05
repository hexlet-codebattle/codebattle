defmodule CodebattleWeb.Live.Tournament.TeamTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Tournament.Helpers

  test "integration tournament start test", %{conn: conn} do
    user1 = insert(:user)
    user2 = insert(:user)
    user3 = insert(:user)
    task = insert(:task, level: "elementary")

    playbook_data = %{
      records: [
        %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
        %{
          "diff" => %{"delta" => [%{"insert" => "t"}], "next_lang" => "ruby", "time" => 20},
          "type" => "update_editor_date",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 1}, %{"insert" => "e"}],
            "next_lang" => "ruby",
            "time" => 20
          },
          "type" => "update_editor_date",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 2}, %{"insert" => "s"}],
            "next_lang" => "ruby",
            "time" => 20
          },
          "type" => "update_editor_date",
          "id" => 2
        },
        %{"type" => "game_over", "id" => 2, "lang" => "ruby"}
      ]
    }

    insert(:playbook, %{data: playbook_data, task: task, winner_lang: "ruby"})

    conn1 = put_session(conn, :user_id, user1.id)
    conn2 = put_session(conn, :user_id, user2.id)
    conn3 = put_session(conn, :user_id, user3.id)

    {:ok, view, _html} = live(conn1, Routes.tournament_path(conn1, :index))

    {:error, {:redirect, %{to: "/tournaments/" <> tournament_id}}} =
      render_submit(view, :create, %{
        "tournament" => %{
          type: "team",
          starts_after_in_minutes: "1",
          team_1_name: "Elixir",
          team_2_name: "",
          match_timeout_seconds: "140",
          name: "test"
        }
      })

    tournament = Codebattle.Tournament.Context.get!(tournament_id)
    assert tournament.meta == %{teams: [%{id: 0, title: "Elixir"}, %{id: 1, title: "Frontend"}]}
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
    assert Enum.count(tournament.data.matches) == 2

    render_click(view1, :cancel)

    tournament = Codebattle.Tournament.Context.get!(tournament.id)
    assert Codebattle.Tournament.Context.get_live_tournaments() == []
    assert tournament.state == "canceled"
    assert Helpers.players_count(tournament) == 4
    assert Enum.count(tournament.data.matches) == 2
  end
end
