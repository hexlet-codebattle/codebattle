defmodule Codebattle.Tournament.Storage.Clans do
  def create_table(id) do
    :ets.new(
      :"t_#{id}_clans",
      [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ]
    )
  end

  def put_clans(tournament, clans) do
    clans
    |> Enum.map(&{&1.id, Map.take(&1, [:id, :name, :long_name])})
    |> then(&:ets.insert(tournament.clans_table, &1))

    :ok
  end

  def get_all(tournament) do
    tournament.clans_table |> :ets.tab2list() |> Enum.into(%{})
  end

  def get_clan(tournament, clan_id) do
    :ets.lookup_element(tournament.clans_table, clan_id, 3)
  rescue
    _e ->
      nil
  end

  def get_clans(tournament, ids) do
    :ets.foldl(
      fn {id, clan}, acc ->
        if id in ids do
          Map.put(acc, id, clan)
        else
          acc
        end
      end,
      %{},
      tournament.clans_table
    )
  end

  def count(tournament) do
    :ets.select_count(tournament.clans_table, [{:_, [], [true]}])
  end
end
