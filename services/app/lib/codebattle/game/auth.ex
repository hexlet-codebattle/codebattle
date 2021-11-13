defmodule Codebattle.Game.Auth do
  alias Codebattle.Game.LiveGames
  alias Codebattle.Game.Helpers

  def can_play_game?(players) when is_list(players) do
    Enum.reduce_while(players, :ok, fn player, _acc ->
      case can_play_game?(player) do
        :ok -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  def can_play_game?(%{is_bot: true}), do: :ok
  def can_play_game?(%{guest: true}), do: {:error, :not_authorized}

  def can_play_game?(player) do
    case LiveGames.playing?(player.id) do
      false -> :ok
      _ -> {:error, :already_in_a_game}
    end
  end

  def player_can_cancel_game?(id, player) do
    case LiveGames.participant?(id, player.id, "waiting_opponent") do
      true -> :ok
      _ -> {:error, "Not authorized"}
    end
  end

  def player_can_rematch?(game, player_id) do
    case Helpers.is_player?(game, player_id) do
      true -> :ok
      _ -> {:error, "Not authorized"}
    end
  end
end
