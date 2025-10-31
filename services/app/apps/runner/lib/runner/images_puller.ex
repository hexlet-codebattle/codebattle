defmodule Runner.ImagesPuller do
  @moduledoc "Periodically pull langs images from github registry"

  use GenServer

  require Logger

  @timeout Application.compile_env(:runner, Runner.ImagesPuller)[:timeout]

  alias Mix.Tasks.Images

  # API
  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  # SERVER
  def init(state) do
    Logger.info("Start Images Puller")
    Process.send_after(self(), :start_pulling, :timer.seconds(100))
    {:ok, state}
  end

  def handle_info(:start_pulling, _state) do
    Images.Pull.run(:start)
    Process.send_after(self(), :start_pulling, @timeout)
    {:noreply, %{}}
  end
end
