defmodule Codebattle.Tournament.GlobalSupervisor do
  use Supervisor

  alias Codebattle.Tournament

  require Logger

  def start_link(_) do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    Task.start(&restore_tournaments/0)

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
    try do
      Supervisor.terminate_child(__MODULE__, to_string(tournament_id))
    rescue
      _ -> Logger.error("tournament not found while terminating #{tournament_id}")
    end
  end

  defp restore_tournaments() do
    if Application.get_env(:codebattle, :restore_tournaments) do
      Tournament.Context.get_tournament_for_restore()
      |> Enum.each(fn tournament ->
        Supervisor.start_child(
          __MODULE__,
          %{
            id: to_string(tournament.id),
            restart: :transient,
            start: {Tournament.Supervisor, :start_link, [tournament]}
          }
        )
      end)
    end
  end
end
