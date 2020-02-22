defmodule Codebattle.GameProcess.FsmHelpers do
  @moduledoc false

  def get_state(fsm), do: fsm.state
  def get_module(fsm), do: fsm.data.module
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
  def get_langs(fsm), do: fsm.data.langs
  def get_first_player(fsm), do: fsm |> get_players |> Enum.at(0)
  def get_second_player(fsm), do: fsm |> get_players |> Enum.at(1)
  def bot_game?(fsm), do: fsm |> get_players |> Enum.any?(fn p -> p.is_bot end)

  def get_winner(fsm) do
    fsm
    |> get_players
    |> Enum.find(fn player -> player.game_result == :won end)
  end

  def get_player(fsm, id) do
    fsm
    |> get_players
    |> Enum.find(fn player -> player.id == id end)
  end

  def is_player?(fsm, id) do
    fsm
    |> get_players
    |> Enum.find(fn player -> player.id == id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def get_opponent(fsm, player_id) do
    fsm
    |> get_players
    |> Enum.find(fn player -> player.id != player_id end)
  end

  def winner?(fsm, player_id), do: is_player_result?(fsm, player_id, :won)
  def lost?(fsm, player_id), do: is_player_result?(fsm, player_id, :lost)
  def gave_up?(fsm, player_id), do: is_player_result?(fsm, player_id, :gave_up)

  defp is_player_result?(fsm, player_id, result) do
    fsm
    |> get_players
    |> Enum.find_value(fn p -> p.id == player_id && p.game_result == result end)
    |> Kernel.!()
    |> Kernel.!()
  end
end
