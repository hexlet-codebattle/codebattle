defmodule Codebattle.Game.TimeoutServer do
  @moduledoc false

  use GenServer

  require Logger

  alias Codebattle.Game

  # API
  def start_timer(game_id, timeout_seconds) do
    :ok = GenServer.cast(server_name(game_id), {:start, timeout_seconds})
  end

  def terminate_after(game_id, timeout_minutes) do
    :ok = GenServer.cast(server_name(game_id), {:terminate, timeout_minutes})
  end

  def start_link(game_id) do
    GenServer.start_link(__MODULE__, game_id, name: server_name(game_id))
  end

  # SERVER

  def init(game_id) do
    Logger.debug("Start timeout server for game_id: #{game_id}")
    {:ok, %{game_id: game_id}}
  end

  def handle_cast({:start, timeout_seconds}, %{game_id: game_id}) do
    Process.send_after(self(), :trigger_timeout, :timer.seconds(timeout_seconds))
    {:noreply, %{game_id: game_id}}
  end

  def handle_cast({:terminate, timeout_minutes}, %{game_id: game_id}) do
    Process.send_after(self(), :trigger_terminate, :timer.minutes(timeout_minutes))
    {:noreply, %{game_id: game_id}}
  end

  def handle_info(:trigger_timeout, %{game_id: game_id}) do
    Game.Context.trigger_timeout(game_id)
    {:noreply, %{game_id: game_id}}
  end

  def handle_info(:trigger_terminate, %{game_id: game_id}) do
    Game.Context.terminate_game(game_id)
    {:noreply, %{game_id: game_id}}
  end

  def handle_info({_, :ok}, state) do
    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, _, _}, state) do
    {:noreply, state}
  end

  defp server_name(game_id),
    do: {:via, Registry, {Codebattle.Registry, "game_timeout_server:#{game_id}"}}
end
