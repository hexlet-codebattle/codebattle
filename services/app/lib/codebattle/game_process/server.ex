defmodule Codebattle.GameProcess.Server do
  @moduledoc "Gen server for main game state"

  use GenServer

  require Logger

  alias Codebattle.GameProcess.Fsm

  # API
  def start_link(game_id, fsm) do
    GenServer.start_link(__MODULE__, fsm, name: server_name(game_id))
  end

  def cast_transition(game_id, event, params) do
    GenServer.cast(server_name(game_id), {:transition, event, params})
  end

  def call_transition(game_id, event, params) do
    GenServer.call(server_name(game_id), {:transition, event, params}, 20_000)
  end

  def fsm(game_id) do
    GenServer.call(server_name(game_id), :fsm, 20_000)
  end

  def game_pid(game_id) do
    :gproc.where(game_key(game_id))
  end

  # SERVER
  def init(fsm) do
    Logger.info("Start game server for game_id: #{fsm.data.game_id}")
    {:ok, fsm}
  end

  def handle_cast({:transition, event, params}, fsm) do
    new_fsm = Fsm.transition(fsm, event, [params])
    {:noreply, new_fsm}
  end

  def handle_call(:fsm, _from, fsm) do
    {:reply, fsm, fsm}
  end

  def handle_call({:transition, event, params}, _from, fsm) do
    case Fsm.transition(fsm, event, [params]) do
      {{:error, reason}, _} ->
        {:reply, {:error, reason, fsm}, fsm}

      new_fsm ->
        {:reply, {:ok, new_fsm}, new_fsm}
    end
  end

  # HELPERS
  defp server_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:game, to_charlist(game_id)}}
  end
end
