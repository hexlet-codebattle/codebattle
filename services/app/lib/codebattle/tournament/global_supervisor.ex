defmodule Codebattle.Tournament.GlobalSupervisor do
  use Supervisor

  alias Codebattle.Tournament
  require Logger

  alias Codebattle.Tournament

  def start_link(_) do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    Supervisor.init([], strategy: :one_for_one)
  end

  def start_tournament(tournament) do
    Supervisor.start_child(
      __MODULE__,
      %{
        id: tournament.id,
        start: {Tournament.Supervisor, :start_link, [tournament]}
      }
    )
  end

  # def start_tournament(tournament) do
  #   spec = {Codebattle.Tournament.Supervisor, tournament}
  #   DynamicSupervisor.start_child(__MODULE__, spec)
  # end

  def terminate_tournament(tournament_id) do
    try do
      Supervisor.delete_child(__MODULE__, tournament_id)
    rescue
      _ -> Logger.error("tournament not found while terminating #{tournament_id}")
    end
  end
end
