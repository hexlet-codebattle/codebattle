defmodule Codebattle.Tournament.Supervisor do
  @moduledoc false

  use DynamicSupervisor

  def start_link() do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_tournament(tournament) do
    spec = {Codebattle.Tournament.Server, tournament}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end
end
