defmodule CodebattleWeb.Live.Admin.ClanIndexViewTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Clan

  defp signed_conn(conn) do
    admin = insert(:admin)
    put_session(conn, :user_id, admin.id)
  end

  test "renders clans", %{conn: conn} do
    insert(:clan, name: "hexlet", long_name: "Hexlet Community")

    {:ok, _view, html} = live(signed_conn(conn), "/admin/clans")

    assert html =~ "Clan Management"
    assert html =~ "hexlet"
    assert html =~ "Hexlet Community"
  end

  test "searches clans by name and long name", %{conn: conn} do
    insert(:clan, name: "alpha", long_name: "Alpha School")
    insert(:clan, name: "beta", long_name: "Beta Academy")

    {:ok, view, _html} = live(signed_conn(conn), "/admin/clans")

    html = render_change(view, "search", %{"query" => "School"})

    assert html =~ "alpha"
    refute html =~ "beta"
  end

  test "creates clan", %{conn: conn} do
    {:ok, view, _html} = live(signed_conn(conn), "/admin/clans")

    assert render_click(view, "new") =~ "Create New Clan"

    html =
      render_submit(view, "save", %{
        "clan" => %{"name" => "new-clan", "long_name" => "New Clan", "creator_id" => ""}
      })

    assert html =~ "Clan created successfully"
    assert html =~ "new-clan"
    assert Clan.get_by_name!("new-clan").long_name == "New Clan"
  end

  test "updates clan", %{conn: conn} do
    clan = insert(:clan, name: "old-clan", long_name: "Old Clan")
    {:ok, view, _html} = live(signed_conn(conn), "/admin/clans")

    assert render_click(view, "edit", %{"id" => clan.id}) =~ "Edit Clan"

    html =
      render_submit(view, "save", %{
        "clan" => %{"name" => "updated-clan", "long_name" => "Updated Clan", "creator_id" => ""}
      })

    assert html =~ "Clan updated successfully"
    assert html =~ "updated-clan"
    assert Clan.get!(clan.id).long_name == "Updated Clan"
  end

  test "deletes clan", %{conn: conn} do
    clan = insert(:clan, name: "delete-me", long_name: "Delete Me")
    {:ok, view, html} = live(signed_conn(conn), "/admin/clans")

    assert html =~ "delete-me"

    html = render_click(view, "delete", %{"id" => clan.id})

    assert html =~ "Clan deleted successfully"
    refute html =~ "delete-me"
    refute Clan.get(clan.id)
  end
end
