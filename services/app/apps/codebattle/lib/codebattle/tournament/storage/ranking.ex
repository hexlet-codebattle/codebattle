defmodule Codebattle.Tournament.Storage.Ranking do
  @moduledoc false
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
      try do
        :ets.insert(tournament.ranking_table, records)
      rescue
        _e ->
          IO.inspect(records, label: "Error inserting ranking records")
          []
      end
    end)
  end

  def put_single_record(tournament, place, record) do
    :ets.insert(tournament.ranking_table, {place, record.id, record})
  rescue
    _e ->
      IO.inspect({place, record.id, record}, label: "Error inserting single ranking record")
  end

  def drop_player(tournament, player_id) do
    match_spec = [{{:"$1", player_id, :"$2"}, [], [true]}]

    try do
      :ets.select_delete(tournament.ranking_table, match_spec)
    rescue
      _e ->
        IO.inspect({player_id, tournament}, label: "Error dropping player from ranking")
    end
  end

  def get_first(tournament, limit) do
    :ets.select(tournament.ranking_table, [
      {{:"$1", :_, :"$3"}, [{:>=, :"$1", 1}, {:"=<", :"$1", limit}], [:"$3"]}
    ])
  rescue
    _e ->
      IO.inspect({tournament, limit}, label: "Error getting first ranking records")
      []
  end

  def get_all(tournament) do
    :ets.select(tournament.ranking_table, [{{:_, :_, :"$3"}, [], [:"$3"]}])
  rescue
    _e ->
      IO.inspect(tournament, label: "Error getting all ranking records")
      []
  end

  def get_by_id(tournament, id) do
    case :ets.select(tournament.ranking_table, [{{:_, :"$2", :"$3"}, [{:==, :"$2", id}], [:"$3"]}]) do
      [ranking_entity] -> ranking_entity
      [] -> nil
    end
  rescue
    _e ->
      IO.inspect({tournament, id}, label: "Error getting ranking record by id")
      nil
  end

  def count(tournament) do
    :ets.select_count(tournament.ranking_table, [{:_, [], [true]}])
  rescue
    _e ->
      IO.inspect(tournament, label: "Error counting ranking records")
      0
  end

  def get_slice(tournament, start_place, end_place) do
    :ets.select(tournament.ranking_table, [
      {{:"$1", :_, :"$3"}, [{:>=, :"$1", start_place}, {:"=<", :"$1", end_place}], [:"$3"]}
    ])
  rescue
    _e ->
      IO.inspect({tournament, start_place, end_place}, label: "Error getting slice of ranking records")
      []
  end
end
