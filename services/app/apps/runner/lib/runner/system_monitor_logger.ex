defmodule Runner.SystemMonitorLogger do
  @moduledoc false

  use GenServer

  require Logger

  @timeout_ms :timer.seconds(5)

  @cpu_cmd ~c"vmstat 1 2|tail -1|awk '{print $15}'"

  def start_link(_) do
    GenServer.start(__MODULE__, [], name: __MODULE__)
  end

  def init(state \\ []) do
    Process.send_after(self(), :get_stats, @timeout_ms)
    {:ok, state}
  end

  def get_stats() do
    send(self(), :get_stats)
  end

  def handle_info(:get_stats, state) do
    Logger.error("Monitor: CPU: #{100 - get_cpu()}")
    Process.send_after(self(), :get_stats, @timeout_ms)
    {:noreply, state}
  end

  def get_cpu do
    @cpu_cmd |> :os.cmd() |> to_string() |> String.trim() |> String.to_integer()
  rescue
    _e ->
      0
  end
end
