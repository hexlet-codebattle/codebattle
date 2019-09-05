defmodule Codebattle.GameProcess.TimeoutServer do
  @moduledoc false

  use GenServer

  require Logger

  alias Codebattle.GameProcess.{Play}

  # API

  def restart(game_id, timeout_seconds) do
    Logger.info(
      "Restart timeout server timer for game_id: #{game_id}, new timeout: #{timeout_seconds} seconds"
    )

    GenServer.cast(server_name(game_id), {:restart, timeout_seconds})
  end

  def start_link(game_id) do
    GenServer.start_link(__MODULE__, game_id, name: server_name(game_id))
  end

  # SERVER

  def init(game_id) do
    Logger.info("Start timeout server for game_id: #{game_id}")
    {:ok, game_id}
  end

  def handle_cast({:restart, timeout_seconds}, game_id) do
    Process.send_after(self(), :trigger_timeout, timeout_seconds * 1000)
    {:noreply, game_id}
  end

  def handle_info(:trigger_timeout, game_id) do
    Play.timeout_game(game_id)
    {:noreply, game_id}
  end

  # FIXME: without these prints error in tests
  def handle_info({_, :ok}, state) do
    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, _, _}, state) do
    {:noreply, state}
  end

  # HELPERS

  defp server_name(game_id) do
    {:via, :gproc, game_key(game_id)}
  end

  defp game_key(game_id) do
    {:n, :l, {:timeout_server, to_charlist(game_id)}}
  end
end
