defmodule Codebattle.GameProcess.Server do
  @moduledoc false
  use GenServer

  alias Codebattle.GameProcess.Fsm

  # API
  def start_link(game_id, fsm) do
    GenServer.start_link(__MODULE__, fsm, name: game_key(game_id))
  end

  def cast_transition(game_id, event, params) do
    GenServer.cast(game_key(game_id), {:transition, event, params})
  end

  def call_transition(game_id, event, params) do
    GenServer.call(game_key(game_id), {:transition, event, params})
  end

  def fsm(game_id) do
    GenServer.call(game_key(game_id), :fsm)
  end

  def game_key(game_id) do
    {:via, :gproc, {:n, :l, {:game, game_id}}}
  end

  # SERVER

  def init(fsm) do
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
        {:reply, {{:error, reason}, fsm}, fsm}
      new_fsm ->
        {:reply, {:ok, new_fsm}, new_fsm}
    end
  end
end
