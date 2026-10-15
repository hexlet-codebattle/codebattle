defmodule Codebattle.GroupTournament.GlobalSupervisor do
  @moduledoc false
  use Supervisor

  require Logger

  def start_link(_) do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    Supervisor.init([], strategy: :one_for_one)
  end

  def start_group_tournament(group_tournament) do
    Supervisor.start_child(
      __MODULE__,
      %{
        id: to_string(group_tournament.id),
        restart: :transient,
        start: {Codebattle.GroupTournament.Supervisor, :start_link, [group_tournament]}
      }
    )
  rescue
    error ->
      {:error, error}
  end

  def terminate_group_tournament(group_tournament_id) do
    Supervisor.terminate_child(__MODULE__, to_string(group_tournament_id))
    Supervisor.delete_child(__MODULE__, to_string(group_tournament_id))
  rescue
    _ -> Logger.error("group tournament not found while terminating #{group_tournament_id}")
  end
end
