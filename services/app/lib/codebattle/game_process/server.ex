defmodule Codebattle.GameProcess.Server do
  @moduledoc "Gen server for main game state"

  use GenServer

  require Logger

  alias Codebattle.GameProcess.Fsm
  alias Codebattle.Bot.Playbook

  # API
  def start_link(game_id, fsm) do
    GenServer.start_link(__MODULE__, fsm, name: server_name(game_id))
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

  def get_fsm(game_id) do
    case game_pid(game_id) do
      :undefined ->
        {:error, :game_terminated}

      _pid ->
        fsm = GenServer.call(server_name(game_id), :get_fsm)
        {:ok, fsm}
    end
  end

  def get_playbook(game_id) do
    case game_pid(game_id) do
      :undefined ->
        {:error, :game_terminated}

      _pid ->
        playbook = GenServer.call(server_name(game_id), :get_playbook)
        {:ok, playbook}
    end
  end

  def game_pid(game_id), do: :gproc.where(game_key(game_id))

  # SERVER
  def init(fsm) do
    Logger.info("Start game server for game_id: #{fsm.data.game_id}")

    state = %{
      fsm: fsm,
      playbook: Playbook.init(fsm)
    }

    {:ok, state}
  end

  def handle_cast({:update_playbook, event, params}, %{fsm: fsm, playbook: playbook}) do
    new_state = %{
      fsm: fsm,
      playbook: Playbook.add_event(playbook, event, params)
    }

    {:noreply, new_state}
  end

  def handle_cast({:transition, event, params}, %{fsm: fsm, playbook: playbook}) do
    new_state = %{
      fsm: Fsm.transition(fsm, event, [params]),
      playbook: Playbook.add_event(playbook, event, params)
    }

    {:noreply, new_state}
  end

  def handle_call(:get_playbook, _from, %{playbook: playbook} = state) do
    {:reply, playbook, state}
  end

  def handle_call(:get_fsm, _from, %{fsm: fsm} = state) do
    {:reply, fsm, state}
  end

  def handle_call({:transition, event, params}, _from, %{fsm: fsm, playbook: playbook} = state) do
    case Fsm.transition(fsm, event, [params]) do
      {{:error, reason}, _} ->
        {:reply, {:error, reason}, state}

      new_fsm ->
        new_state = %{
          fsm: new_fsm,
          playbook: Playbook.add_event(playbook, event, params)
        }

        {:reply, {:ok, new_fsm}, new_state}
    end
  end

  # HELPERS
  defp server_name(game_id), do: {:via, :gproc, game_key(game_id)}
  defp game_key(game_id), do: {:n, :l, {:game, "#{game_id}"}}
end
