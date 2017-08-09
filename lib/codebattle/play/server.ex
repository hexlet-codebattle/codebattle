defmodule Play.Server do
  @moduledoc false

  use GenServer

  #API
  def start_link(game_id, state) do
    GenServer.start_link(__MODULE__, state, name: game_key(game_id))
  end

  def transition(game_id, event, params) do
    GenServer.cast(game_key(game_id), {:transition, event, params})
  end

  def game(game_id) do
    GenServer.call(game_key(game_id), :game)
  end

  def game_key(game_id) do
    {:via, :gproc, {:n, :l, {:game, game_id}}}
  end

  # SERVER
  def init(state) do
    {:ok, state}
  end

  def handle_cast({:transition, event, params}, state) do
    new_state = Play.Fsm.transition(state, event, params)
    {:noreply, new_state}
  end

  def handle_call(:state, _from, state) do
    {:reply, state, state}
  end
end
