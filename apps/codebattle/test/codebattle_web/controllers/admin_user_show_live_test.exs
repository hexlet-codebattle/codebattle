defmodule CodebattleWeb.AdminUserShowLiveTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.User
  alias Codebattle.UserEvent
  alias CodebattleWeb.Live.Admin.UserShowView
  alias Phoenix.LiveView.Socket

  test "admin edit user selector includes moderator", %{conn: conn} do
    admin = insert(:admin)
    user = insert(:user)

    html =
      conn
      |> put_session(:user_id, admin.id)
      |> get(Routes.admin_user_show_view_path(conn, :show, user.id))
      |> html_response(200)

    assert html =~ ~s(value="moderator")
    assert html =~ ">moderator</option>"
  end

  test "admin user profile includes user name editor", %{conn: conn} do
    admin = insert(:admin)
    user = insert(:user)

    html =
      conn
      |> put_session(:user_id, admin.id)
      |> get(Routes.admin_user_show_view_path(conn, :show, user.id))
      |> html_response(200)

    assert html =~ ~s(phx-submit="update_name")
    assert html =~ ~s(name="name")
    assert html =~ ~s(value="#{user.name}")
  end

  test "admin can update user name", _context do
    user = insert(:user)

    {:ok, socket} =
      UserShowView.mount(
        %{"id" => to_string(user.id)},
        %{},
        %Socket{assigns: %{flash: %{}, __changed__: %{}}}
      )

    {:noreply, socket} =
      UserShowView.handle_event(
        "update_name",
        %{"name" => "  renamed-user  "},
        socket
      )

    assert socket.assigns.user.name == "renamed-user"
    assert User.get!(user.id).name == "renamed-user"
  end

  test "admin can see all user events for a user", %{conn: conn} do
    admin = insert(:admin)
    user = insert(:user)

    event1 =
      insert(:event,
        title: "Event One",
        stages: [%{slug: "q1", name: "Q1", status: :active, type: :tournament, playing_type: :single}]
      )

    event2 =
      insert(:event,
        title: "Event Two",
        stages: [%{slug: "q2", name: "Q2", status: :pending, type: :tournament, playing_type: :single}]
      )

    {:ok, _} =
      UserEvent.create(%{
        user_id: user.id,
        event_id: event1.id,
        stages: [%{slug: "q1", status: :started}]
      })

    {:ok, _} =
      UserEvent.create(%{
        user_id: user.id,
        event_id: event2.id,
        stages: [%{slug: "q2", status: :pending}]
      })

    conn =
      conn
      |> put_session(:user_id, admin.id)
      |> get(Routes.admin_user_show_view_path(conn, :show, user.id))

    body = html_response(conn, 200)

    assert body =~ "Event One"
    assert body =~ "Event Two"
    assert body =~ "Edit User Event"
  end

  test "admin can update user event fields and stages", _context do
    user = insert(:user)

    event =
      insert(:event,
        title: "Event Edit",
        stages: [
          %{slug: "qualification", name: "Qualification", status: :active, type: :tournament, playing_type: :single}
        ]
      )

    {:ok, user_event} =
      UserEvent.create(%{
        user_id: user.id,
        event_id: event.id,
        status: "pending",
        stages: [%{slug: "qualification", status: :pending}]
      })

    {:ok, socket} =
      UserShowView.mount(
        %{"id" => to_string(user.id)},
        %{},
        %Socket{assigns: %{flash: %{}, __changed__: %{}}}
      )

    {:noreply, socket} =
      UserShowView.handle_event(
        "open_edit_modal",
        %{"user-event-id" => Integer.to_string(user_event.id)},
        socket
      )

    updated_stages_json =
      Jason.encode!([
        %{
          slug: "qualification",
          status: "completed",
          score: 120,
          wins_count: 3,
          games_count: 4
        }
      ])

    {:noreply, _socket} =
      UserShowView.handle_event(
        "update_user_event_stages",
        %{
          "status" => "completed",
          "current_stage_slug" => "qualification",
          "started_at" => "2026-03-15T11:00:00Z",
          "finished_at" => "2026-03-15T12:00:00Z",
          "stages_json" => updated_stages_json
        },
        socket
      )

    updated_user_event = UserEvent.get!(user_event.id)
    [updated_stage] = updated_user_event.stages

    assert updated_user_event.status == "completed"
    assert updated_user_event.current_stage_slug == "qualification"
    assert updated_stage.score == 120
    assert updated_stage.wins_count == 3
    assert updated_stage.games_count == 4
    assert updated_stage.status == :completed
  end
end
