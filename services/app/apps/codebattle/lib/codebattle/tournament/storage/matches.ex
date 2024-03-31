defmodule Codebattle.Tournament.Matches do
  def create_table(id) do
    :ets.new(
      :"t_#{id}_matches",
      [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ]
    )
  end

  def put_match(tournament, match) do
    :ets.insert(tournament.matches_table, {match.id, match.state, match})
  end

  def get_match(tournament, match_id) do
    :ets.lookup_element(tournament.matches_table, match_id, 3)
  rescue
    _e ->
      nil
  end

  def get_matches(tournament) do
    :ets.select(tournament.matches_table, [{{:"$1", :"$2", :"$3"}, [], [:"$3"]}])
  end

  def get_matches(tournament, matches_ids) when is_list(matches_ids) do
    Enum.map(matches_ids, fn match_id ->
      get_match(tournament, match_id)
    end)
  end

  def get_matches(tournament, state) when is_binary(state) do
    :ets.select(tournament.matches_table, [{{:"$1", state, :"$3"}, [], [:"$3"]}])
  end

  def count(tournament) do
    :ets.select_count(tournament.matches_table, [{:_, [], [true]}])
  end
end
