defmodule CodebattleWeb.AdminFeedbackLiveTest do
  use CodebattleWeb.ConnCase, async: true

  import Inertia.Testing

  alias Codebattle.CodeCheck.Run
  alias Codebattle.Feedback

  test "admin can open feedback page", %{conn: conn} do
    admin = insert(:admin)
    insert(:feedback, status: "Bug", text: "Broken button", author_name: "alice")

    conn =
      conn
      |> log_in_user(admin.id)
      |> get("/admin/feedback")

    assert conn.status == 200
    assert response(conn, 200) =~ "Feedback"
    assert response(conn, 200) =~ "Broken button"
  end

  test "admin publishes one reply that appears in the author's feedback history", %{conn: conn} do
    admin = insert(:admin)
    author = insert(:user)
    item = insert(:feedback, user_id: author.id, text: "Can I upload a task?")
    path = "/admin/feedback/#{item.id}/reply"
    admin_conn = log_in_user(conn, admin)

    assert html_response(get(admin_conn, "/admin/feedback"), 200) =~ ~s(action="#{path}")

    response = post(admin_conn, path, %{"reply" => "  Yes, from the tasks page.  "})
    assert redirected_to(response) == "/admin/feedback#feedback-#{item.id}"
    assert html_response(get(recycle(response), "/admin/feedback"), 200) =~ "Yes, from the tasks page."

    response = post(admin_conn, path, %{"reply" => "Duplicate"})
    assert redirected_to(response) == "/admin/feedback"
    assert Repo.get!(Feedback, item.id).reply == "Yes, from the tasks page."

    history = conn |> log_in_user(author) |> get("/feedback")
    assert inertia_component(history) == "MyFeedback"

    assert [
             %{text: "Can I upload a task?", reply: "Yes, from the tasks page.", replied_at: %NaiveDateTime{}}
           ] = inertia_props(history)["feedback"]
  end

  test "rejects replies from regular users and replies without a recipient or text", %{conn: conn} do
    admin = insert(:admin)
    author = insert(:user)
    item = insert(:feedback, user_id: author.id)
    legacy = insert(:feedback, user_id: nil)
    path = "/admin/feedback/#{item.id}/reply"

    assert conn |> log_in_user(author) |> post(path, %{"reply" => "Spoofed"}) |> redirected_to() == "/"

    admin_conn = log_in_user(conn, admin)
    assert admin_conn |> post(path, %{"reply" => "  "}) |> redirected_to() == "/admin/feedback"

    assert admin_conn |> post("/admin/feedback/#{legacy.id}/reply", %{"reply" => "Hello"}) |> redirected_to() ==
             "/admin/feedback"

    assert Repo.get!(Feedback, item.id).reply == nil
    assert Repo.get!(Feedback, legacy.id).reply == nil
  end

  test "admin can open admin overview page", %{conn: conn} do
    admin = insert(:admin)
    insert(:user)
    insert(:task)
    insert(:game)
    insert(:tournament)

    conn =
      conn
      |> log_in_user(admin.id)
      |> get("/admin")

    assert conn.status == 200
    assert response(conn, 200) =~ "Admin overview"
    assert response(conn, 200) =~ "Registrations"
    assert response(conn, 200) =~ "Games created"
    assert response(conn, 200) =~ "Active players"
    assert response(conn, 200) =~ "Users"
    assert response(conn, 200) =~ "Events"
    assert response(conn, 200) =~ "Tasks"
    assert response(conn, 200) =~ "Games"
    assert response(conn, 200) =~ "Tournaments"
    assert response(conn, 200) =~ "/admin/users"
    assert response(conn, 200) =~ "/admin/clans"
    assert response(conn, 200) =~ "/admin/events"
    assert response(conn, 200) =~ "/admin/seasons"
    assert response(conn, 200) =~ "/admin/feedback"
    assert response(conn, 200) =~ "/admin/games"
    assert response(conn, 200) =~ "/admin/code-checks"
    assert response(conn, 200) =~ "/admin/code-checks?tab=failures"
    assert response(conn, 200) =~ "/feature-flags"
    assert response(conn, 200) =~ "/admin/dashboard"
  end

  test "admin can open online games page", %{conn: conn} do
    admin = insert(:admin)

    conn =
      conn
      |> log_in_user(admin.id)
      |> get("/admin/games")

    assert conn.status == 200
    assert response(conn, 200) =~ "Online Games"
    assert response(conn, 200) =~ "Active games now"
  end

  test "admin can open events page", %{conn: conn} do
    admin = insert(:admin)
    insert(:event, title: "Season Qualifier", slug: "season-qualifier", type: "public")

    conn =
      conn
      |> log_in_user(admin.id)
      |> get("/admin/events")

    assert conn.status == 200
    assert response(conn, 200) =~ "Events"
    assert response(conn, 200) =~ "Season Qualifier"
    assert response(conn, 200) =~ "/events/new"
  end

  test "admin can open code checks page", %{conn: conn} do
    admin = insert(:admin)

    conn =
      conn
      |> log_in_user(admin.id)
      |> get("/admin/code-checks")

    assert conn.status == 200
    assert response(conn, 200) =~ "Code Checks Live"
    assert response(conn, 200) =~ "Run Failures"
    assert response(conn, 200) =~ "Languages"
    assert response(conn, 200) =~ "Aggregated timeline for selected languages."
  end

  test "admin can open code check run failures tab", %{conn: conn} do
    admin = insert(:admin)

    Repo.insert!(
      Run.changeset(%Run{}, %{
        game_id: 777,
        user_id: admin.id,
        lang: "elixir",
        started_at: DateTime.utc_now(),
        duration_ms: 1_500,
        result: "service_timeout",
        error_description: "Code check execution timed out"
      })
    )

    conn =
      conn
      |> log_in_user(admin.id)
      |> get("/admin/code-checks?tab=failures")

    body = response(conn, 200)
    assert conn.status == 200
    assert body =~ "Code Check Run Failures"
    assert body =~ "service_timeout"
    assert body =~ "Code check execution timed out"
  end

  test "non-admin is redirected", %{conn: conn} do
    user = insert(:user)

    conn =
      conn
      |> log_in_user(user.id)
      |> get("/admin/feedback")

    assert conn.status == 302
    assert redirected_to(conn) == "/"
  end
end
