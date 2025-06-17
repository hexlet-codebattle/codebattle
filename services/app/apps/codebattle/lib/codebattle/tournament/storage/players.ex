defmodule Codebattle.Tournament.Players do
  @moduledoc false
  def create_table(id) do
    :ets.new(
      :"t_#{id}_players",
      [
        :set,
        :public,
        {:write_concurrency, true},
        {:read_concurrency, true}
      ]
    )
  end

  def drop_player(tournament, player_id) do
    :ets.delete(tournament.players_table, player_id)
  end

  def count(tournament) do
    :ets.select_count(tournament.players_table, [{:_, [], [true]}])
  end

  def put_player(tournament, player) do
    :ets.insert(tournament.players_table, {player.id, player.state, player})
    player
  end

  def get_player(tournament, player_id) do
    :ets.lookup_element(tournament.players_table, player_id, 3)
  rescue
    _e ->
      nil
  end

  def get_players(tournament) do
    :ets.select(tournament.players_table, [{{:"$1", :"$2", :"$3"}, [], [:"$3"]}])
  end

  def get_players(tournament, state) when is_binary(state) do
    :ets.select(tournament.players_table, [{{:"$1", state, :"$3"}, [], [:"$3"]}])
  end

  def get_players(tournament, player_ids) do
    Enum.map(player_ids, fn player_id ->
      get_player(tournament, player_id)
    end)
  end

  def move_players_from_main_draw(tournament, player_ids) do
    Enum.each(player_ids, fn player_id ->
      tournament
      |> get_player(player_id)
      |> Map.put(:in_main_draw, false)
      |> then(&put_player(tournament, &1))
    end)
  end
end
