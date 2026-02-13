defmodule Codebattle.Game.Server do
  @moduledoc "Gen server for main game state"

  use GenServer

  alias Codebattle.Game
  alias Codebattle.Playbook

  require Logger

  # API
  def start_link(game) do
    GenServer.start_link(__MODULE__, game, name: server_name(game.id))
  end

  def get_game(game_id) do
    game = GenServer.call(server_name(game_id), :get_game)
    {:ok, game}
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def get_playbook_records(game_id) do
    records = GenServer.call(server_name(game_id), :get_playbook_records)
    {:ok, records}
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def fire_transition(game_id, event, params \\ %{})

  def fire_transition(game_id, event, params) do
    GenServer.call(server_name(game_id), {:transition, event, params})
  end

  def init_playbook(game_id) do
    GenServer.cast(server_name(game_id), :init_playbook)
  end

  def update_playbook(game_id, type, params) do
    GenServer.cast(server_name(game_id), {:update_playbook, type, params})
  end

  def freeze(game_id) do
    GenServer.call(server_name(game_id), :freeze)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def unfreeze(game_id) do
    GenServer.call(server_name(game_id), :unfreeze)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def export_state(game_id) do
    GenServer.call(server_name(game_id), :export_state)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def import_state(game_id, snapshot) do
    GenServer.call(server_name(game_id), {:import_state, snapshot})
  catch
    :exit, _reason -> {:error, :not_found}
  end

  # SERVER
  @impl GenServer
  def init(game) do
    Logger.debug("Start game server for game_id: #{game.id}")

    state = %{
      game: game,
      is_record_games: !FunWithFlags.enabled?(:skip_record_games),
      playbook_state: %{records: [], id: 0},
      frozen: false
    }

    {:ok, state}
  end

  @impl GenServer
  def handle_cast(:init_playbook, state) do
    if state.frozen do
      {:noreply, state}
    else
      %{game: game} = state

      {:noreply,
       %{
         state
         | playbook_state: Playbook.Context.init_records(game.players)
       }}
    end
  end

  @impl GenServer
  def handle_cast({:update_playbook, type, params}, state) do
    if state.frozen do
      {:noreply, state}
    else
      %{playbook_state: playbook_state} = state

      {:noreply,
       %{
         state
         | playbook_state: Playbook.Context.add_record(playbook_state, type, params)
       }}
    end
  end

  @impl GenServer
  def handle_call(:get_playbook_records, _from, state) do
    {:reply, state.playbook_state.records, state}
  end

  @impl GenServer
  def handle_call(:get_game, _from, state) do
    {:reply, state.game, state}
  end

  @impl GenServer
  def handle_call({:transition, event, params}, _from, state) do
    %{game: game, playbook_state: playbook_state, is_record_games: is_record_games} = state

    if state.frozen do
      {:reply, {:error, :handoff_in_progress}, state}
    else
      case Game.Fsm.transition(event, game, params) do
        {:error, reason} ->
          {:reply, {:error, reason}, state}

        {:ok, %Game{} = new_game} ->
          if is_record_games do
            {:reply, {:ok, {game.state, new_game}},
             %{
               state
               | game: new_game,
                 playbook_state: Playbook.Context.add_record(playbook_state, event, params)
             }}
          else
            {:reply, {:ok, {game.state, new_game}}, %{state | game: new_game}}
          end
      end
    end
  end

  @impl GenServer
  def handle_call(:freeze, _from, state) do
    {:reply, :ok, %{state | frozen: true}}
  end

  @impl GenServer
  def handle_call(:unfreeze, _from, state) do
    {:reply, :ok, %{state | frozen: false}}
  end

  @impl GenServer
  def handle_call(:export_state, _from, state) do
    snapshot = %{
      game: state.game,
      playbook_state: state.playbook_state,
      is_record_games: state.is_record_games
    }

    {:reply, {:ok, snapshot}, state}
  end

  @impl GenServer
  def handle_call({:import_state, snapshot}, _from, state) do
    imported_state = %{
      state
      | game: Map.get(snapshot, :game, state.game),
        playbook_state: Map.get(snapshot, :playbook_state, state.playbook_state),
        is_record_games: Map.get(snapshot, :is_record_games, state.is_record_games),
        frozen: false
    }

    {:reply, :ok, imported_state}
  end

  defp server_name(game_id), do: {:via, Registry, {Codebattle.Registry, "game_srv:#{game_id}"}}
end
