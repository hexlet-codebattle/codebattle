defmodule CodebattleWeb.AdminUserIndexLiveTest do
  use CodebattleWeb.ConnCase, async: true

  test "admin can search by a partial email address or name", %{conn: conn} do
    target = insert(:user, name: "Email Match", email: "player_one@example.com")
    other = insert(:user, name: "Another Account", email: "playerXone@example.com")
    bot = insert(:user, email: "bot-player_one@example.com", is_bot: true)
    archived = insert(:user, email: "archived-player_one@example.com", archived_at: DateTime.utc_now(:second))

    assert {:ok, view, _html} = conn |> log_in_user(insert(:admin)) |> live("/admin/users")

    assert has_element?(view, ~s(input[placeholder="Search by name or email"]))

    search = element(view, "#user-search-form")
    render_change(search, %{"query" => " PLAYER_ONE@ "})

    assert has_element?(view, "#user-name-#{target.id}")
    refute has_element?(view, "#user-name-#{other.id}")
    refute has_element?(view, "#user-name-#{bot.id}")
    refute has_element?(view, "#user-name-#{archived.id}")

    render_submit(search, %{"query" => "Another Account"})

    assert has_element?(view, "#user-name-#{other.id}")
    refute has_element?(view, "#user-name-#{target.id}")
  end
end
