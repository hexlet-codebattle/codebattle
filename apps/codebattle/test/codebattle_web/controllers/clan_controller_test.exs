defmodule CodebattleWeb.ClanControllerTest do
  use CodebattleWeb.ConnCase

  alias Codebattle.Clan

  defp signed_conn(conn, user) do
    put_session(conn, :user_id, user.id)
  end

  defp position(html, value) do
    {index, _length} = :binary.match(html, value)
    index
  end

  test "index renders clan totals, player counts, created date, and no long name", %{conn: conn} do
    user = insert(:user)
    creator = insert(:user, name: "Clan Creator")
    clan = insert(:clan, name: "alpha", long_name: "Alpha Long Name", creator_id: creator.id)
    insert(:user, clan_id: clan.id, clan: clan.name)
    insert(:user, clan_id: clan.id, clan: clan.name)

    html =
      conn
      |> signed_conn(user)
      |> get(Routes.clan_path(conn, :index))
      |> html_response(200)

    assert html =~ "Total clans:"
    assert html =~ "alpha"
    assert html =~ "Clan Creator"
    assert html =~ "Players"
    assert html =~ "Created at"
    assert html =~ ~s(sort=players_count)
    assert html =~ ~s(<td class="align-middle text text-white cb-border-color">2</td>)
    refute html =~ "Alpha Long Name"
    refute html =~ "Delete"
  end

  test "index orders clans by players count", %{conn: conn} do
    user = insert(:user)
    insert(:clan, name: "alpha")
    bravo = insert(:clan, name: "bravo")
    insert(:user, clan_id: bravo.id, clan: bravo.name)

    html =
      conn
      |> signed_conn(user)
      |> get(Routes.clan_path(conn, :index, sort: "players_count", order: "desc"))
      |> html_response(200)

    assert position(html, "bravo") < position(html, "alpha")
  end

  test "index shows delete action for admin", %{conn: conn} do
    admin = insert(:admin)
    insert(:clan, name: "delete-visible")

    html =
      conn
      |> signed_conn(admin)
      |> get(Routes.clan_path(conn, :index))
      |> html_response(200)

    assert html =~ "delete-visible"
    assert html =~ "Delete"
  end

  test "admin deletes clan from public list", %{conn: conn} do
    admin = insert(:admin)
    clan = insert(:clan, name: "delete-me")

    conn =
      conn
      |> signed_conn(admin)
      |> delete(Routes.clan_path(conn, :delete, clan.id))

    assert redirected_to(conn) == Routes.clan_path(conn, :index)
    refute Clan.get(clan.id)
  end

  test "non admin cannot delete clan from public list", %{conn: conn} do
    user = insert(:user)
    clan = insert(:clan, name: "keep-me")

    conn =
      conn
      |> signed_conn(user)
      |> delete(Routes.clan_path(conn, :delete, clan.id))

    assert redirected_to(conn) == Routes.clan_path(conn, :index)
    assert Clan.get(clan.id)
  end
end
