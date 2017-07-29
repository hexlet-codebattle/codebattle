defmodule Player.Server do

  use GenServer

  #API
  def start_link(id) do
    GenServer.start_link(__MODULE__, [], name: game_name(id))
  end

  def add_message(game_id, message) do
    GenServer.cast(game_name(game_id), {:add_message, message})
  end

  def get_messages(game_id) do
    GenServer.call(game_name(game_id), :get_messages)
  end

  defp game_name(game_id) do
    {:via, :gproc, {:n, :l, {:game, game_id}}}
  end

  # SERVER
  def init(messages) do
    {:ok, messages}
  end

  def handle_cast({:add_message, new_message}, messages) do
    {:noreply, [new_message | messages]}
  end

  def handle_call(:get_messages, _from, messages) do
    {:reply, messages, messages}
  end
end

