defmodule Codebattle.Tournament.Storage.Ranking do
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
    |> then(&:ets.insert(tournament.ranking_table, &1))
  end

  def get_first(tournament, num) do
    :ets.select(tournament.ranking_table, [
      {{:"$1", :_, :"$3"}, [{:>=, :"$1", 1}, {:"=<", :"$1", num}], [:"$3"]}
    ])
  end

  def get_all(tournament) do
    :ets.select(tournament.ranking_table, [{{:_, :_, :"$3"}, [], [:"$3"]}])
  end

  def get_by_id(tournament, id) do
    :ets.lookup_element(tournament.ranking_table, id, 2)
  end

  def count(tournament) do
    :ets.select_count(tournament.ranking_table, [{:_, [], [true]}])
  end

  def get_slice(tournament, start_place, end_place) do
    :ets.select(tournament.ranking_table, [
      {{:"$1", :_, :"$3"}, [{:>=, :"$1", start_place}, {:"=<", :"$1", end_place}], [:"$3"]}
    ])
  end
end
