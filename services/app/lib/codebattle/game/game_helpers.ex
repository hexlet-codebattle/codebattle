defmodule Codebattle.Game.GameHelpers do
  @moduledoc false

  def get_state(game), do: game.state
  def get_module(game), do: game.data.module
  def get_game_id(game), do: game.data.game_id
  def get_tournament_id(game), do: game.data.tournament_id
  def get_inserted_at(game), do: game.data.inserted_at
  def get_starts_at(game), do: game.data.starts_at
  def get_timeout_seconds(game), do: game.data.timeout_seconds
  def get_type(game), do: game.data.type
  def get_level(game), do: game.data.level
  def get_rematch_state(game), do: game.data.rematch_state
  def get_rematch_initiator_id(game), do: game.data.rematch_initiator_id
  def get_players(game), do: game.data.players
  def get_task(game), do: game.data.task
  def get_langs(game), do: game.data.langs
  def get_first_player(game), do: game |> get_players |> Enum.at(0)
  def get_second_player(game), do: game |> get_players |> Enum.at(1)
  def bot_game?(game), do: game |> get_players |> Enum.any?(fn p -> p.is_bot end)

  def get_winner(game) do
    game
    |> get_players
    |> Enum.find(fn player -> player.game_result == :won end)
  end

  def get_player(game, id) do
    game
    |> get_players
    |> Enum.find(fn player -> player.id == id end)
  end

  def is_player?(game, id) do
    game
    |> get_players
    |> Enum.find(fn player -> player.id == id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def get_opponent(game, player_id) do
    game
    |> get_players
    |> Enum.find(fn player -> player.id != player_id end)
  end

  def winner?(game, player_id), do: is_player_result?(game, player_id, :won)
  def lost?(game, player_id), do: is_player_result?(game, player_id, :lost)
  def gave_up?(game, player_id), do: is_player_result?(game, player_id, :gave_up)

  defp is_player_result?(game, player_id, result) do
    game
    |> get_players
    |> Enum.find_value(fn p -> p.id == player_id && p.game_result == result end)
    |> Kernel.!()
    |> Kernel.!()
  end
end
