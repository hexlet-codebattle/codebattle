defmodule CodebattleWeb.Live.Admin.UserIndexViewTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.User

  defp signed_conn(conn) do
    admin = insert(:admin)
    put_session(conn, :user_id, admin.id)
  end

  test "admin can update user clan", %{conn: conn} do
    user = insert(:user, name: "Clan User")
    clan = insert(:clan, name: "admin-clan", long_name: "Admin Clan")

    {:ok, view, html} = live(signed_conn(conn), "/admin/users")

    assert html =~ "Clan User"
    assert html =~ "admin-clan"

    render_change(view, "update_clan", %{
      "user" => %{"user_id" => user.id, "clan_id" => clan.id}
    })

    updated_user = User.get!(user.id)

    assert updated_user.clan_id == clan.id
    assert updated_user.clan == clan.name
  end

  test "admin can update user name", %{conn: conn} do
    user = insert(:user, name: "Old Admin Name")

    {:ok, view, html} = live(signed_conn(conn), "/admin/users")

    assert html =~ "Old Admin Name"

    render_submit(view, "update_name", %{
      "user" => %{"user_id" => user.id, "name" => "  New Admin Name  "}
    })

    assert User.get!(user.id).name == "New Admin Name"
  end

  test "admin can clear user clan", %{conn: conn} do
    clan = insert(:clan, name: "old-clan", long_name: "Old Clan")
    user = insert(:user, name: "Clear Clan User", clan: clan.name, clan_id: clan.id)

    {:ok, view, _html} = live(signed_conn(conn), "/admin/users")

    render_change(view, "update_clan", %{
      "user" => %{"user_id" => user.id, "clan_id" => ""}
    })

    updated_user = User.get!(user.id)

    refute updated_user.clan_id
    refute updated_user.clan
  end
end
