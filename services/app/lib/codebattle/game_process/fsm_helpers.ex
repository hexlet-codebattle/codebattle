defmodule Codebattle.GameProcess.FsmHelpers do
  @moduledoc false

  alias Codebattle.GameProcess.Player

  # HELPERS
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

  def get_players(fsm) do
    fsm.data.players
  end

  def get_task(fsm) do
    fsm.data.task
  end

  # def get_users(fsm) do
  #   fsm.data.players
  #   |> Enum.filter(fn player -> player.id end)
  #   |> Enum.map(fn player -> player.user end)
  # end

  def get_first_player(fsm) do
    get_players(fsm) |> Enum.at(0)
  end

  def get_second_player(fsm) do
    get_players(fsm) |> Enum.at(1)
  end

  def get_opponent(fsm, player_id) do
    player =
      get_players(fsm)
      |> Enum.find(fn player -> player.id != player_id end)

    player || %Player{}
  end

  def get_game_id(fsm) do
    fsm.data.game_id
  end

  def get_starts_at(fsm) do
    fsm.data.starts_at
  end

  def get_joins_at(fsm) do
    fsm.data.joins_at
  end

  def get_task(fsm) do
    fsm.data.task
  end

  def get_type(fsm) do
    fsm.data.type
  end

  def get_level(fsm) do
    fsm.data.level
  end

  # TODO: implement is_true function instead Kernel.! * 2
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

  def bot_game?(fsm) do
    fsm.data.bots
  end

  def lobby_format(fsm) do
    %{
      game_info: %{
        state: fsm.state,
        level: fsm.data.level,
        starts_at: fsm.data.starts_at,
        type: fsm.data.type
      },
      users: fsm.data.players,
      game_id: fsm.data.game_id
    }
  end
end
