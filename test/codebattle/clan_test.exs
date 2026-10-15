defmodule Codebattle.ClanTest do
  use Codebattle.DataCase

  alias Codebattle.Clan

  test "manages clans and supports all statistics ordering modes" do
    creator = insert(:user)
    assert {:ok, first} = Clan.create(%{name: "alpha-clan", long_name: "Alpha Clan", creator_id: creator.id})
    assert {:ok, second} = Clan.create(%{name: "beta-clan", long_name: "Beta Clan", creator_id: creator.id})
    insert(:user, clan_id: second.id, clan: second.name)

    assert :creator |> Clan.get_all() |> Enum.map(& &1.id) |> Enum.sort() == Enum.sort([first.id, second.id])
    assert Clan.get(first.id).id == first.id
    assert Clan.get!(first.id).id == first.id
    assert Clan.get_by_name!(first.name).id == first.id
    assert Enum.map(Clan.get_by_ids([second.id]), & &1.id) == [second.id]
    assert Enum.map(Clan.search(" Alpha "), & &1.id) == [first.id]
    assert length(Clan.search("")) == 2

    assert [top | _] = Clan.list_with_stats(sort: "players_count", order: "desc")
    assert top.id == second.id
    assert top.users_count == 1

    for opts <- [
          [sort: "players_count", order: "asc"],
          [sort: "created_at", order: "asc"],
          [sort: "created_at", order: "desc"],
          [sort: "name", order: "desc"],
          [sort: "name", order: "asc"]
        ] do
      assert length(Clan.list_with_stats(opts)) == 2
    end

    assert {:ok, existing} = Clan.find_or_create_by_clan(" alpha-clan ", creator.id)
    assert existing.id == first.id
    assert {:ok, created} = Clan.find_or_create_by_clan("new-clan", creator.id)
    assert created.name == "new-clan"

    assert {:ok, updated} = Clan.update(first, %{long_name: "Updated Alpha"})
    assert updated.long_name == "Updated Alpha"
    assert {:ok, deleted} = Clan.delete(created)
    assert deleted.id == created.id
  end
end
