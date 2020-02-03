defmodule Codebattle.DockerLangsPuller do
  @moduledoc "Periodically pull langs docker containers from DockerHub"

  use GenServer

  require Logger

  @timeout Application.get_env(:codebattle, Codebattle.DockerLangsPuller)[:timeout]

  alias Mix.Tasks.Dockers

  # API
  def start_link() do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  # SERVER
  def init(state) do
    Logger.info("Start Docker Puller")
    Process.send_after(self(), :start_pulling, @timeout)
    {:ok, state}
  end

  def handle_info(:start_pulling, _state) do
    Dockers.Pull.run(:start)
    Process.send_after(self(), :start_pulling, @timeout)
    {:noreply, %{}}
  end
end
