defmodule Codebattle.Game.TimeoutServer do
  @moduledoc false

  use GenServer

  require Logger

  alias Codebattle.Game.{Play}

  # API
  def start_timer(game_id, timeout_seconds) do
    Logger.info("Start timer for game_id: #{game_id},  timeout: #{timeout_seconds} seconds")

    GenServer.cast(server_name(game_id), {:start, timeout_seconds})
  end

  def start_link(game_id) do
    GenServer.start_link(__MODULE__, game_id, name: server_name(game_id))
  end

  # SERVER

  def init(game_id) do
    Logger.info("Start timeout server for game_id: #{game_id}")
    {:ok, %{game_id: game_id}}
  end

  def handle_cast({:start, timeout_seconds}, %{game_id: game_id}) do
    Process.send_after(self(), :trigger_timeout, :timer.seconds(timeout_seconds))
    {:noreply, %{game_id: game_id}}
  end

  def handle_info(:trigger_timeout, %{game_id: game_id} = state) do
    case Play.timeout_game(game_id) do
      {:terminate_after, minutes} ->
        Process.send_after(self(), :terminate, :timer.minutes(minutes))
        {:noreply, state}

      _ ->
        {:noreply, state}
    end
  end

  def handle_info(:terminate, %{game_id: game_id}) do
    Play.terminate_game(game_id)
    {:noreply, %{game_id: game_id}}
  end

  # TODO: FIXME without these prints error in tests
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
    {:n, :l, {:timeout_server, "#{game_id}"}}
  end
end
