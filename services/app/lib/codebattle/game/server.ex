defmodule Codebattle.Game.Server do
  @moduledoc "Gen server for main game state"

  use GenServer

  require Logger

  alias Codebattle.Game.Fsm
  alias Codebattle.Bot.Playbook

  # API
  def start_link(game) do
    GenServer.start_link(__MODULE__, game, name: server_name(game.id))
  end

  def update_playbook(game_id, event, params) do
    GenServer.cast(server_name(game_id), {:update_playbook, event, params})
  end

  def cast_transition(game_id, event, params) do
    GenServer.cast(server_name(game_id), {:transition, event, params})
  end

  def call_transition(game_id, event, params) do
    GenServer.call(server_name(game_id), {:transition, event, params})
  end

  def get_game(game_id) do
    try do
      game = GenServer.call(server_name(game_id), :get_game)
      {:ok, game}
    catch
      :exit, _reason -> {:error, :not_found}
    end
  end

  def get_playbook(game_id) do
    try do
      palybook = GenServer.call(server_name(game_id), :get_playbook)
      {:ok, palybook}
    catch
      :exit, _reason -> {:error, :not_found}
    end
  end

  # SERVER
  def init(game) do
    Logger.info("Start game server for game_id: #{game.id}")

    state = %{
      game: game,
      playbook: Playbook.init(game)
    }

    {:ok, state}
  end

  def handle_cast({:update_playbook, event, params}, %{game: game, playbook: playbook}) do
    new_state = %{
      game: game,
      playbook: Playbook.add_event(playbook, event, params)
    }

    {:noreply, new_state}
  end

  def handle_cast({:transition, event, params}, %{game: game, playbook: playbook}) do
    new_state = %{
      game: apply(Fsm, event, [game, params]),
      playbook: Playbook.add_event(playbook, event, params)
    }

    {:noreply, new_state}
  end

  def handle_call(:get_playbook, _from, %{playbook: playbook} = state) do
    {:reply, playbook, state}
  end

  def handle_call(:get_game, _from, %{game: game} = state) do
    {:reply, game, state}
  end

  def handle_call({:transition, event, params}, _from, %{game: game, playbook: playbook} = state) do
    case apply(Fsm, event, [game, params]) do
      {{:error, reason}, _} ->
        {:reply, {:error, reason}, state}

      new_game ->
        new_state = %{
          game: new_game,
          playbook: Playbook.add_event(playbook, event, params)
        }

        {:reply, {:ok, {game, new_game}}, new_state}
    end
  end

  # HELPERS
  defp server_name(game_id), do: {:via, :gproc, game_key(game_id)}
  defp game_key(game_id), do: {:n, :l, {:game_srv, to_string(game_id)}}
end
