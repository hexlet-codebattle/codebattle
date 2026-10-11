defmodule Codebattle.Tournament.Storage.Ranking do
  @moduledoc false
  require Logger

  defp with_table(tournament, default, fun) do
    table = tournament.ranking_table

    cond do
      is_nil(table) ->
        default

      :ets.info(table) == :undefined ->
        default

      true ->
        fun.(table)
    end
  rescue
    _e ->
      default
  end

  def create_table(id) do
    table =
      :ets.new(
        :"t_#{id}_ranking",
        [
          :set,
          :public,
          {:write_concurrency, true},
          {:read_concurrency, true}
        ]
      )

    :ets.insert(table, {:max_place, 0})
    table
  end

  def put_ranking(tournament, elements) do
    with_table(tournament, [], fn table ->
      old_entries = :ets.select(table, [{{{:id, :_}, :"$1"}, [], [:"$1"]}])
      new_ids = MapSet.new(elements, & &1.id)
      new_places = MapSet.new(elements, & &1.place)
      max_place = Enum.reduce(elements, 0, &max(&1.place, &2))
      records = Enum.flat_map(elements, &records/1)

      # ETS inserts the complete list atomically, including the id index. Readers
      # keep seeing a populated leaderboard while obsolete rows are removed.
      :ets.insert(table, [{:max_place, max_place} | records])

      old_entries
      |> Enum.map(& &1.place)
      |> Enum.reject(&MapSet.member?(new_places, &1))
      |> Enum.each(&:ets.delete(table, &1))

      old_entries
      |> Enum.map(& &1.id)
      |> Enum.reject(&MapSet.member?(new_ids, &1))
      |> Enum.each(&:ets.delete(table, {:id, &1}))

      true
    end)
  rescue
    _e ->
      Logger.error("Error inserting #{length(elements)} ranking records")
      []
  end

  def put_single_record(tournament, place, record) do
    with_table(tournament, :ok, fn table ->
      case :ets.lookup(table, place) do
        [{^place, old_id, _record}] when old_id != record.id -> :ets.delete(table, {:id, old_id})
        _ -> :ok
      end

      max_place = max(place, :ets.lookup_element(table, :max_place, 2))
      :ets.insert(table, [{:max_place, max_place}, {place, record.id, record}, {{:id, record.id}, record}])
    end)
  rescue
    _e ->
      Logger.error("Error inserting single ranking record: #{inspect({place, record.id, record})}")
  end

  def drop_player(tournament, player_id) do
    with_table(tournament, 0, fn table ->
      case :ets.lookup(table, {:id, player_id}) do
        [{{:id, ^player_id}, %{place: place}}] ->
          :ets.delete(table, place)
          :ets.delete(table, {:id, player_id})
          1

        [] ->
          0
      end
    end)
  end

  def get_first(tournament, limit) do
    get_slice(tournament, 1, limit)
  rescue
    _e ->
      Logger.error("Error getting first ranking records: #{inspect({tournament, limit})}")
      []
  end

  def get_all(tournament) do
    with_table(tournament, [], fn table ->
      table
      |> :ets.select([{{:_, :_, :"$3"}, [], [:"$3"]}])
      |> Enum.sort_by(& &1.place)
    end)
  rescue
    _e ->
      Logger.error("Error getting all ranking records: #{inspect(tournament)}")
      []
  end

  def get_by_id(tournament, id) do
    with_table(tournament, nil, fn table ->
      case :ets.lookup(table, {:id, id}) do
        [{{:id, ^id}, ranking_entity}] -> ranking_entity
        [] -> nil
      end
    end)
  rescue
    _e ->
      Logger.error("Error getting ranking record by id: #{inspect({tournament, id})}")
      nil
  end

  def count(tournament) do
    with_table(tournament, 0, fn table ->
      div(:ets.info(table, :size) - 1, 2)
    end)
  rescue
    _e ->
      Logger.error("Error counting ranking records: #{inspect(tournament)}")
      0
  end

  def next_place(tournament) do
    with_table(tournament, 1, &(:ets.lookup_element(&1, :max_place, 2) + 1))
  end

  def get_slice(_tournament, start_place, end_place) when start_place > end_place, do: []

  def get_slice(tournament, start_place, end_place) do
    with_table(tournament, [], fn table ->
      max_place = :ets.lookup_element(table, :max_place, 2)
      slice_records(table, max(start_place, 1), min(end_place, max_place))
    end)
  rescue
    _e ->
      Logger.error("Error getting slice of ranking records: #{inspect({tournament, start_place, end_place})}")
      []
  end

  defp slice_records(_table, start_place, end_place) when start_place > end_place, do: []

  defp slice_records(table, start_place, end_place) do
    Enum.flat_map(start_place..end_place, &records_at_place(table, &1))
  end

  defp records_at_place(table, place) do
    case :ets.lookup(table, place) do
      [{^place, _id, record}] -> [record]
      [] -> []
    end
  end

  defp records(record), do: [{record.place, record.id, record}, {{:id, record.id}, record}]
end
