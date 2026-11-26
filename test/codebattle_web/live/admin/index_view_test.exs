defmodule CodebattleWeb.Live.Admin.IndexViewTest do
  use CodebattleWeb.ConnCase

  test "activity links keep each metric's date range and load the selected chart", %{conn: conn} do
    conn = log_in_user(conn, insert(:admin))
    {:ok, view, _html} = live(conn, "/admin?registrations_window=last_week")

    assert has_element?(view, ~s(nav[aria-label="Activity date range"] [aria-current="true"]), "7 days")
    assert render_async(view) =~ "Registrations over time"

    assert view
           |> element(~s(nav[aria-label="Activity metric"] a), "Games created")
           |> render_click() =~ "Platform activity"

    path = assert_patch(view)
    assert URI.decode_query(URI.parse(path).query) == %{"metric" => "games", "registrations_window" => "last_week"}
    assert has_element?(view, ~s(nav[aria-label="Activity date range"] [aria-current="true"]), "3 months")
    assert render_async(view) =~ "No activity recorded in this range."
    assert has_element?(view, "#admin-chart-games")

    view |> element(~s(nav[aria-label="Activity date range"] a), "1 year") |> render_click()
    assert_patch(view)
    view |> element(~s(nav[aria-label="Activity metric"] a), "Registrations") |> render_click()

    path = assert_patch(view)

    assert URI.decode_query(URI.parse(path).query) == %{
             "games_window" => "last_year",
             "registrations_window" => "last_week"
           }

    assert has_element?(view, ~s(nav[aria-label="Activity date range"] [aria-current="true"]), "7 days")
  end

  test "dashboard navigation identifies the current section and links to common workflows", %{conn: conn} do
    conn = conn |> log_in_user(insert(:admin)) |> get("/admin/")
    html = html_response(conn, 200)
    document = Floki.parse_document!(html)

    assert Floki.attribute(document, ~s(nav[aria-label="Administration"] [aria-current="page"]), "href") == ["/admin"]
    assert Floki.attribute(document, ".admin-action-primary", "href") == ["/admin/events/new"]
    assert "/admin/code-checks?tab=failures" in Floki.attribute(document, ".admin-tool", "href")
  end
end
