defmodule Codebattle.Tournament.Matches do
  def create_table do
    :ets.new(:t_matches, [:set, :public, {:write_concurrency, true}, {:read_concurrency, true}])
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

alias Codebattle.Tournament.Matches, as: M
table = M.create_table()
t = %{matches_table: table}

M.put_match(t, %{id: 1, game_id: 1, state: "canceled", player_ids: [1, 2]})
M.put_match(t, %{id: 2, game_id: 2, state: "canceled", player_ids: [3, 4]})
M.put_match(t, %{id: 3, game_id: 3, state: "game_over", player_ids: [1, 2]})
M.put_match(t, %{id: 4, game_id: 4, state: "timeout", player_ids: [3, 4]})
M.put_match(t, %{id: 5, game_id: 5, state: "playing", player_ids: [1, 2]})
M.put_match(t, %{id: 6, game_id: 6, state: "playing", player_ids: [3, 4]})

M.get_match(t, 1)
M.get_matches(t)
M.get_matches(t, [2, 3])
M.get_matches(t, "playing")
M.get_matches(t, "canceled")
