defmodule Codebattle.Game.Server do
  @moduledoc "Gen server for main game state"

  use GenServer

  require Logger

  alias Codebattle.Game
  alias Codebattle.Playbook

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
    GenServer.call(server_name(game_id), :get_playbook_records)
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def fire_transition(game_id, event, params) do
    GenServer.call(server_name(game_id), {:transition, event, params})
  end

  def init_playbook(game_id) do
    GenServer.cast(server_name(game_id), :init_playbook)
  end

  def update_playbook(game_id, type, params) do
    GenServer.cast(server_name(game_id), {:update_playbook, type, params})
  end

  # SERVER
  @impl GenServer
  def init(game) do
    Logger.info("Start game server for game_id: #{game.id}")

    state = %{
      game: game,
      playbook_records: [],
      playbook_records_count: 0
    }

    {:ok, state}
  end

  def handle_cast(:init_playbook, state) do
    playbook_records = Playbook.Context.init_records(%{players: state.game.players})

    {:noreply,
     %{
       state
       | playbook_records: playbook_records,
         playbook_records_id: Enum.count(playbook_records)
     }}
  end

  def handle_cast({:update_playbook, type, params}, state) do
    %{playbook_records_id: playbook_records_id, playbook_records: playbook_records} = state

    {:noreply,
     %{
       state
       | playbook_records:
           Playbook.Context.add_record(playbook_records, playbook_records_id, type, params),
         playbook_records_count: playbook_records_count + 1
     }}
  end

  def handle_call(:get_playbook_records, _from, state) do
    {:reply, state.playbook_records, state}
  end

  def handle_call(:get_game, _from, state) do
    {:reply, state.game, state}
  end

  def handle_call({:transition, event, params}, _from, %{game: game, playbook: playbook} = state) do
    case Game.Fsm.transition(event, game, params) do
      {{:error, reason}, _} ->
        {:reply, {:error, reason}, state}

      {:ok, new_game = %Game{}} ->
        new_state = %{
          game: new_game,
          playbook: Playbook.add_event(playbook, event, params)
        }

        {:reply, {:ok, {game.state, new_game}}, new_state}
    end
  end

  defp server_name(game_id), do: {:via, Registry, {Codebattle.Registry, "game_srv:#{game_id}"}}
end
