defmodule Codebattle.GameProcess.FsmHelpers do
  @moduledoc false

  alias Codebattle.User
  alias Codebattle.GameProcess.Player

  # HELPERS
  def get_winner(fsm) do
    player = fsm.data.players
             |> Enum.find(fn(player) -> player.winner == true end)
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

  def get_opponent(fsm, user_id) do
    player = fsm.data.players
             |> Enum.find(fn(player) -> player.id != user_id end)
    player.user || %User{}
  end

  def is_winner?(data, user_id) do
    data.players
    |> Enum.find_value(fn(player) ->
      player.id == user_id && player.winner == true
    end)
  end

  def is_player?(data, user_id) do
    data.players |> Enum.find_value(fn(player) -> player.id == user_id end)
                 |> Kernel.!
                 |> Kernel.!
  end
end
