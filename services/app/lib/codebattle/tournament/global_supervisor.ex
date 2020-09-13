defmodule Codebattle.Tournament.GlobalSupervisor do
  use DynamicSupervisor

  require Logger

  alias Codebattle.Tournament

  def start_link() do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_tournament(tournament) do
    spec = {Codebattle.Tournament.Supervisor, tournament}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def terminate_tournament(tournament_id) do
    pid = Tournament.Supervisor.get_pid(tournament_id)

    try do
      Supervisor.terminate_child(__MODULE__, pid)
    rescue
      _ -> Logger.error("tournament not found while terminating #{pid}")
    end
  end
end
