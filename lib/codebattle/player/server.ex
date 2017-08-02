defmodule Player.Server do
  @moduledoc false

  use GenServer

  #API
  def start_link(id, game_id) do
    GenServer.start_link(__MODULE__, [], name: player_name(id))
  end

  def add_message(player_id, message) do
    GenServer.cast(player_name(player_id), {:add_message, message})
  end

  def get_messages(player_id) do
    GenServer.call(player_name(player_id), :get_messages)
  end

  defp player_name(player_id) do
    {:via, :gproc, {:n, :l, {:game, player_id}}}
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
