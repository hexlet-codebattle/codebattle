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

  test "treats names differing only in case and spaces as the same clan" do
    creator = insert(:user)
    assert {:ok, clan} = Clan.create(%{name: "МГУ им. Ломоносова", creator_id: creator.id})

    assert {:ok, found} = Clan.find_or_create_by_clan("мгу им.Ломоносова", creator.id)
    assert found.id == clan.id

    assert {:error, changeset} = Clan.create(%{name: "МГУ  им.ломоносова", creator_id: creator.id})
    assert {"has already been taken", _} = changeset.errors[:name]

    assert {:ok, other} = Clan.create(%{name: "СПбГУ", creator_id: creator.id})
    assert {:error, _changeset} = Clan.rename(other, %{"name" => "мгу им. ломоносова"})
    assert {:ok, _renamed} = Clan.rename(clan, %{"name" => "МГУ им.Ломоносова"})
  end

  test "lets the creator delete only an empty clan, admins any" do
    creator = insert(:user)
    stranger = insert(:user)
    admin = insert(:admin)
    assert {:ok, clan} = Clan.create(%{name: "empty-clan", creator_id: creator.id})

    assert Clan.can_delete?(clan, creator)
    refute Clan.can_delete?(clan, stranger)

    insert(:user, clan_id: clan.id, clan: clan.name)
    refute Clan.can_delete?(clan, creator)
    assert Clan.can_delete?(clan, admin)
  end
end
