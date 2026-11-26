defmodule CodebattleWeb.AdminNavigationTest do
  use CodebattleWeb.ConnCase, async: true

  test "admin LiveViews share a sidebar outside the content replaced by live navigation", %{conn: conn} do
    conn = log_in_user(conn, insert(:admin))
    document = conn |> get("/admin") |> html_response(200) |> Floki.parse_document!()

    assert Floki.find(document, "#admin-main > [data-phx-main]") != []
    assert Floki.find(document, "[data-phx-main] .admin-sidebar") == []
    assert Floki.attribute(document, ~s(.admin-sidebar a[href="/admin"]), "aria-current") == ["page"]
    assert Floki.attribute(document, ~s(.admin-sidebar a[href="/admin/feedback"]), "data-phx-link") == ["redirect"]
    assert Floki.attribute(document, ~s(.admin-sidebar a[href="/admin/connections"]), "data-phx-link") == []
    assert Floki.find(document, ~s(.admin-sidebar a[href="/admin/invites"])) == []

    assert {:ok, feedback, _html} = live(conn, "/admin/feedback")
    assert {:ok, games, html} = live_redirect(feedback, to: "/admin/games")
    assert html =~ "Online Games"
    assert render_click(element(games, ~s(button[phx-click="reload"]))) =~ "Online Games"
  end

  test "live navigation checks the user's current admin permissions", %{conn: conn} do
    admin = insert(:admin)
    assert {:ok, feedback, _html} = conn |> log_in_user(admin) |> live("/admin/feedback")

    admin
    |> Ecto.Changeset.change(subscription_type: :free)
    |> Repo.update!()

    assert {:error, {:redirect, %{to: "/"}}} = live_redirect(feedback, to: "/admin/games")
  end
end
