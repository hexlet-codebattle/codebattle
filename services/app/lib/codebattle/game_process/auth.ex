defmodule Codebattle.GameProcess.Auth do
  alias Codebattle.GameProcess.ActiveGames
  alias Codebattle.GameProcess.FsmHelpers

  def player_can_create_game?(%{guest: true}, "training"), do: :ok

  def player_can_create_game?(%{guest: true}, _type), do: {:error, "Not authorized"}

  def player_can_create_game?(player, _type), do: player_can_create_game?(player)

  def player_can_create_game?(player) do
    case ActiveGames.playing?(player.id) do
      false ->
        :ok

      _ ->
        {:error, "You are already in a game"}
    end
  end

  def player_can_join_game?(%{guest: true}, "training"), do: :ok

  def player_can_join_game?(%{guest: true}, _type), do: {:error, "Not authorized"}

  def player_can_join_game?(player, _type), do: player_can_join_game?(player)

  def player_can_join_game?(player) do
    case ActiveGames.playing?(player.id) do
      false ->
        :ok

      _ ->
        {:error, "You are already in a game"}
    end
  end

  def player_can_cancel_game?(id, player) do
    case ActiveGames.participant?(id, player.id, :waiting_opponent) do
      true ->
        :ok

      _ ->
        {:error, "Not authorized"}
    end
  end

  def player_can_rematch?(fsm, player_id) do
    case FsmHelpers.is_player?(fsm, player_id) do
      true ->
        :ok

      _ ->
        {:error, "Not authorized"}
    end
  end
end
