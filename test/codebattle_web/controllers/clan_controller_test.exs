defmodule CodebattleWeb.ClanControllerTest do
  use CodebattleWeb.ConnCase

  import Inertia.Testing

  alias Codebattle.Clan

  defp signed_conn(conn, user) do
    log_in_user(conn, user.id)
  end

  test "index sends clans with player counts and creators", %{conn: conn} do
    user = insert(:user)
    creator = insert(:user, name: "Clan Creator")
    clan = insert(:clan, name: "alpha", long_name: "Alpha Long Name", creator_id: creator.id)
    insert(:user, clan_id: clan.id, clan: clan.name)
    insert(:user, clan_id: clan.id, clan: clan.name)

    conn = conn |> signed_conn(user) |> get(Routes.clan_path(conn, :index))

    assert inertia_component(conn) == "ClanIndex"
    assert %{"clans" => clans, "sort" => "name", "order" => "asc"} = inertia_props(conn)
    assert %{users_count: 2, creator: %{name: "Clan Creator"}} = Enum.find(clans, &(&1.id == clan.id))
  end

  test "index orders clans by players count", %{conn: conn} do
    user = insert(:user)
    insert(:clan, name: "alpha")
    bravo = insert(:clan, name: "bravo")
    insert(:user, clan_id: bravo.id, clan: bravo.name)

    conn =
      conn
      |> signed_conn(user)
      |> get(Routes.clan_path(conn, :index, sort: "players_count", order: "desc"))

    names = Enum.map(inertia_props(conn)["clans"], & &1.name)
    assert Enum.find_index(names, &(&1 == "bravo")) < Enum.find_index(names, &(&1 == "alpha"))
  end

  test "show sends a clan without a creator", %{conn: conn} do
    user = insert(:user)
    clan = insert(:clan, name: "creatorless", creator_id: nil)

    conn = conn |> signed_conn(user) |> get(Routes.clan_path(conn, :show, clan))

    assert inertia_component(conn) == "ClanShow"
    assert %{"clan" => %{name: "creatorless", creator: nil}, "members" => [], "can_edit" => false} = inertia_props(conn)
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
