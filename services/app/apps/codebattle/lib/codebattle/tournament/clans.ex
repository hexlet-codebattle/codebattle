defmodule Codebattle.Tournament.Clans do
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Storage.Clans

  @spec add_players_clan(tournament :: Tournament.t(), player :: Tournament.Player.t()) :: :ok
  def add_players_clan(tournament, %{clan_id: nil}) do
    Clans.put_clans(tournament, [%{id: -1, name: "UndifinedClan", long_name: "UndifinedClan"}])
  end

  def add_players_clan(tournament, player) do
    case Clans.get_clan(tournament, player.clan_id) do
      nil ->
        case Codebattle.Clan.get(player.clan_id) do
          nil -> :ok
          clan -> Clans.put_clans(tournament, [clan])
        end

      _clan ->
        :ok
    end
  end

  @spec put_clans(tournament :: Tournament.t(), clans :: list(map())) :: :ok
  def put_clans(%{clans_table: nil}, _clans), do: :ok
  def put_clans(tournament, clans), do: Clans.put_clans(tournament, clans)

  @spec get_all(tournament :: Tournament.t()) :: list(map())
  def get_all(%{clans_table: nil}), do: []
  def get_all(tournament), do: Clans.get_all(tournament)

  @spec get_clan(tournament :: Tournament.t(), clan_id :: integer()) :: map() | nil
  def get_clan(%{clans_table: nil}, _clan_id), do: nil
  def get_clan(tournament, clan_id), do: Clans.get_clan(tournament, clan_id)

  @spec get_clans(tournament :: Tournament.t(), ids :: list(integer())) :: list(map())
  def get_clans(%{clans_table: nil}, _ids), do: []
  def get_clans(_tournament, []), do: []
  def get_clans(tournament, ids), do: Clans.get_clans(tournament, ids)

  @spec count(tournament :: Tournament.t()) :: non_neg_integer()
  def count(%{clans_table: nil}), do: 0
  def count(tournament), do: Clans.count(tournament)

  @spec create_table(pos_integer()) :: term()
  def create_table(tournament_id) do
    Clans.create_table(tournament_id)
  end
end
