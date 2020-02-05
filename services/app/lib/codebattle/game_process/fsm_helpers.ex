defmodule Codebattle.GameProcess.FsmHelpers do
  @moduledoc false

  alias Codebattle.GameProcess.Player

  def get_state(fsm), do: fsm.state
  def get_game_id(fsm), do: fsm.data.game_id
  def get_tournament_id(fsm), do: fsm.data.tournament_id
  def get_inserted_at(fsm), do: fsm.data.inserted_at
  def get_starts_at(fsm), do: fsm.data.starts_at
  def get_timeout_seconds(fsm), do: fsm.data.timeout_seconds
  def get_type(fsm), do: fsm.data.type
  def get_level(fsm), do: fsm.data.level
  def get_rematch_state(fsm), do: fsm.data.rematch_state
  def get_rematch_initiator_id(fsm), do: fsm.data.rematch_initiator_id
  def get_players(fsm), do: fsm.data.players
  def get_task(fsm), do: fsm.data.task
  def get_first_player(fsm), do: get_players(fsm) |> Enum.at(0)
  def get_second_player(fsm), do: get_players(fsm) |> Enum.at(1)
  def bot_game?(fsm), do: fsm.data.is_bot_game

  def get_winner(fsm) do
    player =
      fsm.data.players
      |> Enum.find(fn player -> player.game_result == :won end)

    player || %Player{}
  end

  def get_player(fsm, id) do
    player =
      get_players(fsm)
      |> Enum.find(fn player -> player.id == id end)

    player || %Player{}
  end

  def get_opponent(fsm, player_id) do
    player =
      get_players(fsm)
      |> Enum.find(fn player -> player.id != player_id end)

    player || %Player{}
  end

  def winner?(fsm, player_id) do
    fsm.data.players
    |> Enum.find_value(fn player ->
      player.id == player_id && player.game_result == :won
    end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def lost?(fsm, player_id) do
    fsm.data.players
    |> Enum.find_value(fn player ->
      player.id == player_id && player.game_result == :lost
    end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def gave_up?(fsm, player_id) do
    fsm.data.players
    |> Enum.find_value(fn player ->
      player.id == player_id && player.game_result == :gave_up
    end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def player?(fsm, player_id) do
    fsm.data.players
    |> Enum.find_value(fn player -> player.id == player_id end)
    |> Kernel.!()
    |> Kernel.!()
  end
end
