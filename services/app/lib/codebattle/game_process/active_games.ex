defmodule Codebattle.GameProcess.ActiveGames do
  @moduledoc """
    ActiveGames for game list
  """

  alias Codebattle.GameProcess.FsmHelpers

  @table_name :active_games

  # {game_id, active, %{player_id => Player, player_id => Player}, %{level: "easy", state: :playing, timeout_seconds: 0, starts_at: Time, type: "private"}}

  def init do
    try do
      :ets.new(@table_name, [:ordered_set, :public, :named_table])
      :ok
    rescue
      _e -> :error
    end
  end

  def get_games(params \\ %{}) do
    list_games(params)
    |> Enum.map(fn {_game_id, players, game_params} ->
      Map.merge(game_params, %{players: Map.values(players)})
    end)
  end

  def get_playing_bots do
    list_games()
    |> Enum.map(fn {_, players_map, _} -> players_map |> Map.values() end)
    |> List.flatten()
    |> Enum.filter(fn player -> player.is_bot == true end)
  end

  def game_exists?(game_id) do
    :ets.match_object(@table_name, {game_key(game_id), :_, :_}) |> Enum.empty?() |> Kernel.!()
  end

  def terminate_game(game_id) do
    :ets.delete(@table_name, game_key(game_id))
    :ok
  end

  def create_game(fsm) do
    game_id = FsmHelpers.get_game_id(fsm)
    :ets.insert_new(@table_name, {game_key(game_id), build_players(fsm), build_game_params(fsm)})
    :ok
  end

  def update_game(fsm) do
    game_id = FsmHelpers.get_game_id(fsm)

    :ets.insert(@table_name, {game_key(game_id), build_players(fsm), build_game_params(fsm)})
    :ok
  end

  def playing?(player_id) do
    @table_name |> :ets.match_object({:_, %{player_id => %{}}, :_}) |> Enum.empty?() |> Kernel.!()
  end

  def participant?(game_id, player_id, state \\ :_) do
    @table_name
    |> :ets.match_object({game_key(game_id), %{player_id => %{}}, %{state: state}})
    |> Enum.empty?()
    |> Kernel.!()
  end

  def setup_game(fsm) do
    game_id = FsmHelpers.get_game_id(fsm)

    :ets.insert(@table_name, {game_key(game_id), build_players(fsm), build_game_params(fsm)})
    :ok
  end

  defp list_games(params \\ %{}), do: :ets.match_object(@table_name, {:_, :_, params})

  defp game_key(game_id), do: "#{game_id}"

  defp build_game_params(fsm) do
    %{
      id: FsmHelpers.get_game_id(fsm),
      state: FsmHelpers.get_state(fsm),
      is_bot: FsmHelpers.bot_game?(fsm),
      level: FsmHelpers.get_level(fsm),
      inserted_at: FsmHelpers.get_inserted_at(fsm),
      type: FsmHelpers.get_type(fsm),
      timeout_seconds: FsmHelpers.get_timeout_seconds(fsm)
    }
  end

  defp build_players(fsm) do
    fsm
    |> FsmHelpers.get_players()
    |> Enum.reduce(%{}, fn player, acc -> Map.put(acc, player.id, player) end)
  end
end
