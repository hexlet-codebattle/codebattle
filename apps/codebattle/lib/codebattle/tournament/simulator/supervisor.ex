defmodule Codebattle.Tournament.Simulator.Supervisor do
  @moduledoc """
  DynamicSupervisor that owns one `Codebattle.Tournament.Simulator` GenServer
  per active simulated tournament.
  """

  use DynamicSupervisor

  alias Codebattle.Tournament.Simulator

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_), do: DynamicSupervisor.init(strategy: :one_for_one)

  @spec start_child(integer()) :: {:ok, pid()} | {:error, term()}
  def start_child(tournament_id) when is_integer(tournament_id) do
    spec = %{
      id: {Simulator, tournament_id},
      start: {Simulator, :start_link, [tournament_id]},
      restart: :transient
    }

    DynamicSupervisor.start_child(__MODULE__, spec)
  end
end
