defmodule Codebattle.Game.Auth do
  @moduledoc false
  alias Codebattle.Game

  def player_can_play_game?(players) when is_list(players) do
    Enum.reduce_while(players, :ok, fn player, _acc ->
      case player_can_play_game?(player) do
        :ok -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  def player_can_play_game?(%{is_bot: true}), do: :ok
  def player_can_play_game?(%{is_guest: true}), do: {:error, :not_authorized}

  def player_can_play_game?(player) do
    if active_game_id(player.id) do
      {:error, :already_in_a_game}
    else
      :ok
    end
  end

  @doc "The live game (waiting or playing) that blocks this human player from starting another one."
  @spec active_game_id(integer()) :: integer() | nil
  def active_game_id(player_id) do
    Enum.find_value(Game.Context.get_active_games(), fn game ->
      case Game.Helpers.get_player(game, player_id) do
        %{is_bot: true} -> nil
        nil -> nil
        _player -> game.id
      end
    end)
  end

  def player_can_cancel_game?(game, player) do
    case {Game.Helpers.player?(game, player.id), game.state} do
      {true, "waiting_opponent"} -> :ok
      {false, _} -> {:error, :not_authorized}
      {_, _} -> {:error, :only_waiting_opponent}
    end
  end

  def player_can_rematch?(game, player_id) do
    if Game.Helpers.player?(game, player_id) do
      :ok
    else
      {:error, :not_authorized}
    end
  end
end
