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
    is_player =
      Enum.any?(Game.Context.get_active_games(), fn game ->
        Game.Helpers.player?(game, player.id)
      end)

    if is_player do
      {:error, :already_in_a_game}
    else
      :ok
    end
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
