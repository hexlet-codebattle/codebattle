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
    :ets.new(
      :"t_#{id}_ranking",
      [
        :ordered_set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ]
    )
  end

  def put_ranking(tournament, elements) do
    elements
    |> Enum.map(&{&1.place, &1.id, &1})
    |> then(fn records ->
      with_table(tournament, [], fn table ->
        try do
          :ets.delete_all_objects(table)
          :ets.insert(table, records)
        rescue
          _e ->
            Logger.error("Error inserting ranking records: #{inspect(records)}")
            []
        end
      end)
    end)
  end

  def put_single_record(tournament, place, record) do
    with_table(tournament, :ok, fn table ->
      :ets.insert(table, {place, record.id, record})
    end)
  rescue
    _e ->
      Logger.error("Error inserting single ranking record: #{inspect({place, record.id, record})}")
  end

  def drop_player(tournament, player_id) do
    match_spec = [{{:"$1", player_id, :"$2"}, [], [true]}]

    with_table(tournament, 0, fn table ->
      try do
        :ets.select_delete(table, match_spec)
      rescue
        _e ->
          Logger.error("Error dropping player from ranking: #{inspect({player_id, tournament})}")
      end
    end)
  end

  def get_first(tournament, limit) do
    with_table(tournament, [], fn table ->
      :ets.select(table, [
        {{:"$1", :_, :"$3"}, [{:>=, :"$1", 1}, {:"=<", :"$1", limit}], [:"$3"]}
      ])
    end)
  rescue
    _e ->
      Logger.error("Error getting first ranking records: #{inspect({tournament, limit})}")
      []
  end

  def get_all(tournament) do
    with_table(tournament, [], fn table ->
      :ets.select(table, [{{:_, :_, :"$3"}, [], [:"$3"]}])
    end)
  rescue
    _e ->
      Logger.error("Error getting all ranking records: #{inspect(tournament)}")
      []
  end

  def get_by_id(tournament, id) do
    with_table(tournament, nil, fn table ->
      case :ets.select(table, [{{:_, :"$2", :"$3"}, [{:==, :"$2", id}], [:"$3"]}]) do
        [ranking_entity] -> ranking_entity
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
      :ets.select_count(table, [{:_, [], [true]}])
    end)
  rescue
    _e ->
      Logger.error("Error counting ranking records: #{inspect(tournament)}")
      0
  end

  def get_slice(tournament, start_place, end_place) do
    with_table(tournament, [], fn table ->
      :ets.select(table, [
        {{:"$1", :_, :"$3"}, [{:>=, :"$1", start_place}, {:"=<", :"$1", end_place}], [:"$3"]}
      ])
    end)
  rescue
    _e ->
      Logger.error("Error getting slice of ranking records: #{inspect({tournament, start_place, end_place})}")
      []
  end
end
