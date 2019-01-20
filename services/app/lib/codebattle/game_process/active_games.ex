defmodule Codebattle.GameProcess.ActiveGames do
  @moduledoc """
    ActiveGames for game list
  """

  @table_name :active_games
  # {game_id, %{player_id => Player, player_id => Player}, %{level: "easy", state: :playing, is_private: false}}

  alias Codebattle.GameProcess.FsmHelpers

  def new do
    try do
      :ets.new(@table_name, [:ordered_set, :public, :named_table])
    rescue
      e in ArgumentError -> e
    end
  end

  def list_games do
    :ets.match_object(@table_name, :_)
  end

  def game_exists?(game_id) do
    :ets.match_object(@table_name, {game_key(game_id), :_, :_}) |> Enum.empty?() |> Kernel.!
  end

  def terminate_game(game_id) do
    :ets.delete(@table_name, game_key(game_id))
  end

  def create_game(user, fsm) do
    case playing?(user.id) do
      true ->
        :error

      false ->
        game_id =  FsmHelpers.get_game_id(fsm)
        players = %{user.id => FsmHelpers.get_first_player(fsm)}

        :ets.insert(@table_name, {game_key(game_id), players, game_params(fsm)})
        :ok
    end
  end

  def add_participant(fsm) do
    game_id =  FsmHelpers.get_game_id(fsm)

    players =
      fsm |> FsmHelpers.get_players()
      |> Enum.reduce(%{}, fn player, acc -> Map.put(acc, player.id, player) end)

    :ets.update_element(@table_name, game_key(game_id), [{2, players}, {3, game_params(fsm)}])
    :ok
  end

  def playing?(player_id) do
    @table_name |> :ets.match_object({:_, %{player_id => %{}}, :_}) |> Enum.empty?() |> Kernel.!()
  end

  def participant?(game_id, player_id) do
    @table_name
    |> :ets.match_object({game_key(game_id), %{player_id => %{}}, :_})
    |> Enum.empty?()
    |> Kernel.!()
  end

  def setup_game(fsm) do
    game_id =  FsmHelpers.get_game_id(fsm)

    players =
      fsm
      |> FsmHelpers.get_players()
      |> Enum.reduce(%{}, fn player, acc -> Map.put(acc, player.id, player) end)

    :ets.insert(@table_name, {game_key(game_id), players, game_params(fsm)})
  end

  defp game_key(game_id) when is_integer(game_id) do
    game_id
  end

  defp game_key(game_id) when is_binary(game_id) do
    game_id |> Integer.parse() |> elem(0)
  end

  defp game_key(game_id) when is_list(game_id) do
    game_id |> to_string |> game_key
  end

  defp game_params(fsm) do
    %{
      state: fsm.state,
      level:  FsmHelpers.get_level(fsm),
      starts_at: FsmHelpers.get_starts_at(fsm),
      is_private: FsmHelpers.private?(fsm)
    }
  end
end
