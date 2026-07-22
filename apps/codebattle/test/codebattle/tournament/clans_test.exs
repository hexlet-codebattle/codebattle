defmodule Codebattle.Tournament.ClansTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament.Clans

  test "provides no-op behavior for restored tournaments without ETS" do
    tournament = %{clans_table: nil}
    assert Clans.put_clans(tournament, [%{id: 1}]) == :ok
    assert Clans.get_all(tournament) == %{}
    assert Clans.get_clan(tournament, 1) == nil
    assert Clans.get_clans(tournament, [1]) == %{}
    assert Clans.get_clans(tournament, []) == %{}
    assert Clans.count(tournament) == 0
  end

  test "adds and queries player clans through tournament storage" do
    table = Clans.create_table(System.unique_integer([:positive]))
    tournament = %{clans_table: table}
    clan = insert(:clan)

    assert :ok = Clans.add_players_clan(tournament, %{clan_id: nil})
    assert Clans.get_clan(tournament, -1).name == "UndefinedClan"

    assert :ok = Clans.add_players_clan(tournament, %{clan_id: clan.id})
    assert Clans.get_clan(tournament, clan.id).name == clan.name
    assert :ok = Clans.add_players_clan(tournament, %{clan_id: clan.id})
    assert :ok = Clans.add_players_clan(tournament, %{clan_id: -999})

    assert Clans.count(tournament) == 2
    assert Map.has_key?(Clans.get_all(tournament), clan.id)
    assert Clans.get_clans(tournament, [clan.id])[clan.id].id == clan.id
  end
end
