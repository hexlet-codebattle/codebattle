defmodule Codebattle.GameProcess.FsmHelpers do
  @moduledoc false

  alias Codebattle.User
  alias Codebattle.GameProcess.Player

  # HELPERS
  def get_winner(fsm) do
    player = fsm.data.players
             |> Enum.find(fn(player) -> player.game_result == :won end)
    player && player.user || %User{}
  end

  def get_player(fsm, id) do
    player = fsm.data.players
             |> Enum.find(fn(player) -> player.id == id end)
    player || %Player{}
  end

  def get_users(fsm) do
    fsm.data.players
      |> Enum.filter(fn(player) -> player.id end)
      |> Enum.map(fn(player) -> player.user end)
  end

  def get_first_player(fsm) do
    fsm.data.players |> Enum.at(0) || %Player{}
  end

  def get_second_player(fsm) do
    fsm.data.players |> Enum.at(1) || %Player{}
  end

  def get_opponent(data, user_id) do
    player = data.players
             |> Enum.find(fn(player) -> player.id != user_id end)
    player.user || %User{}
  end

  #TODO: implement is_true function instead Kernel.! * 2
  def winner?(data, user_id) do
    data.players
      |> Enum.find_value(fn(player) ->
        player.id == user_id && player.game_result == :won
      end)
      |> Kernel.!
      |> Kernel.!
  end

  def lost?(data, user_id) do
    data.players
      |> Enum.find_value(fn(player) ->
        player.id == user_id && player.game_result == :lost
      end)
        |> Kernel.!
        |> Kernel.!
  end

  def gave_up?(data, user_id) do
    data.players
      |> Enum.find_value(fn(player) ->
        player.id == user_id && player.game_result == :gave_up
      end)
      |> Kernel.!
      |> Kernel.!
  end

  def player?(data, user_id) do
    data.players |> Enum.find_value(fn(player) -> player.id == user_id end)
                 |> Kernel.!
                 |> Kernel.!
  end
end
