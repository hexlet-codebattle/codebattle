defmodule Codebattle.Tournament.Matches do
  @moduledoc false
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

  def update_match(tournament, match_id, params) do
    case get_match(tournament, match_id) do
      nil ->
        :noop

      match ->
        match = Map.merge(match, params)
        put_match(tournament, match)
    end
  end

  def put_match(tournament, match) do
    :ets.insert(tournament.matches_table, {match.id, match.state, match.round_position, match})
  end

  def get_match(tournament, match_id) do
    :ets.lookup_element(tournament.matches_table, match_id, 4)
  rescue
    _e ->
      nil
  end

  def get_matches(tournament) do
    :ets.select(tournament.matches_table, [{{:_, :_, :_, :"$1"}, [], [:"$1"]}])
  end

  def get_matches(tournament, matches_ids) when is_list(matches_ids) do
    Enum.map(matches_ids, fn match_id ->
      get_match(tournament, match_id)
    end)
  end

  def get_matches(tournament, state) when is_binary(state) do
    :ets.select(tournament.matches_table, [{{:_, state, :_, :"$1"}, [], [:"$1"]}])
  end

  def get_round_matches(tournament, round_position) do
    :ets.select(tournament.matches_table, [{{:_, :_, round_position, :"$1"}, [], [:"$1"]}])
  end

  def get_round_playing_matches(tournament, round_position) do
    :ets.select(tournament.matches_table, [{{:_, "playing", round_position, :"$1"}, [], [:"$1"]}])
  end

  def count(tournament) do
    :ets.info(tournament.matches_table, :size)
  end
end
