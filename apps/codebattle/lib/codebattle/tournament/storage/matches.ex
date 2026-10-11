defmodule Codebattle.Tournament.Matches do
  @moduledoc """
  ETS storage for tournament matches.

  Match rows are `{id, state, round_position, match}`. Next to them the table keeps a
  playing index: a 1-tuple `{{:playing, round_position, id}}` per playing match. The table
  is an `ordered_set`, so index reads with a bound `{:playing, round, _}` prefix traverse
  only the playing matches instead of the whole tournament history. Index writes are
  idempotent (insert or delete by key), so concurrent writers cannot make it drift.
  """

  @playing :playing

  def create_table(id) do
    :ets.new(
      :"t_#{id}_matches",
      [
        :ordered_set,
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
    table = tournament.matches_table

    case :ets.lookup(table, match.id) do
      [{_id, _state, round_position, _match}] when round_position != match.round_position ->
        :ets.delete(table, {@playing, round_position, match.id})

      _ ->
        :ok
    end

    :ets.insert(table, {match.id, match.state, match.round_position, match})
    put_index(table, match)
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

  def get_matches(tournament, "playing") do
    tournament
    |> playing_ids(:_)
    |> lookup_playing(tournament)
  end

  def get_matches(tournament, state) when is_binary(state) do
    :ets.select(tournament.matches_table, [{{:_, state, :_, :"$1"}, [], [:"$1"]}])
  end

  def get_round_matches(tournament, round_position) do
    :ets.select(tournament.matches_table, [{{:_, :_, round_position, :"$1"}, [], [:"$1"]}])
  end

  def get_round_playing_matches(tournament, round_position) do
    tournament
    |> playing_ids(round_position)
    |> lookup_playing(tournament)
  end

  @doc "Whether any match (of the given round, or of any round) is still playing."
  def playing?(tournament, round_position \\ :_) do
    spec = [{{{@playing, round_position, :_}}, [], [true]}]
    :ets.select(tournament.matches_table, spec, 1) != :"$end_of_table"
  end

  def count(tournament) do
    table = tournament.matches_table
    :ets.info(table, :size) - :ets.select_count(table, [{{{@playing, :_, :_}}, [], [true]}])
  end

  @doc "Rebuilds the playing index from the match rows (after importing rows from elsewhere)."
  def rebuild_index(tournament) do
    table = tournament.matches_table
    :ets.select_delete(table, [{{{@playing, :_, :_}}, [], [true]}])
    Enum.each(get_matches(tournament), &put_index(table, &1))
  end

  defp put_index(table, %{state: "playing"} = match) do
    :ets.insert(table, {{@playing, match.round_position, match.id}})
  end

  defp put_index(table, match) do
    :ets.delete(table, {@playing, match.round_position, match.id})
  end

  defp playing_ids(tournament, round_position) do
    :ets.select(tournament.matches_table, [{{{@playing, round_position, :"$1"}}, [], [:"$1"]}])
  end

  # A row may change state between the index read and the lookup; keep only matches
  # that are still playing.
  defp lookup_playing(ids, tournament) do
    ids
    |> Enum.map(&get_match(tournament, &1))
    |> Enum.filter(&match?(%{state: "playing"}, &1))
  end
end
