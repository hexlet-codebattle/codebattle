defmodule Codebattle.Tournament.GlobalSupervisor do
  @moduledoc false
  use Supervisor

  alias Codebattle.Tournament

  require Logger

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
        id: to_string(tournament.id),
        restart: :transient,
        start: {Tournament.Supervisor, :start_link, [tournament]}
      }
    )
  end

  def terminate_tournament(tournament_id) do
    Supervisor.terminate_child(__MODULE__, to_string(tournament_id))
    Supervisor.delete_child(__MODULE__, to_string(tournament_id))
  rescue
    _ -> Logger.error("tournament not found while terminating #{tournament_id}")
  end
end
