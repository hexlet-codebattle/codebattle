defmodule Codebattle.GameProcess.Auth do
  alias Codebattle.GameProcess.ActiveGames

  def player_can_create_game?(player) do
    case ActiveGames.playing?(player.id) do
      false ->
        :ok

      _ ->
        {:error, "You are already in a game"}
    end
  end

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

  def player_can_give_up?(id, player) do
    case ActiveGames.participant?(id, player.id, :playing) do
      true ->
        :ok

      _ ->
        {:error, "Not authorized"}
    end
  end

  def player_can_check_game?(id, player) do
    :ok
    # case ActiveGames.participant?(id, player.id) do
    #   true ->
    #     :ok

    #   _ ->
    #     {:error, "Not authorized"}
    # end
  end

  def player_can_update_editor_data?(id, player) do
    :ok
    # case ActiveGames.participant?(id, player.id) do
    #   true ->
    #     :ok

    #   _ ->
    #     {:error, "Not authorized"}
    # end
  end
end
