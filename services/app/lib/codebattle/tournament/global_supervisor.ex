defmodule Codebattle.Tournament.GlobalSupervisor do
  use Supervisor

  alias Codebattle.Tournament

  require Logger

  def start_link(_) do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    children =
      case Mix.env() do
        :test ->
          []

        _ ->
          Tournament.Context.get_tournament_for_restore()
          |> Enum.map(fn tournament ->
            %{
              id: tournament.id,
              start: {Tournament.Supervisor, :start_link, [tournament]}
            }
          end)
      end

    Supervisor.init(children, strategy: :one_for_one)
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

  def terminate_tournament(tournament_id) do
    try do
      Supervisor.delete_child(__MODULE__, tournament_id)
    rescue
      _ -> Logger.error("tournament not found while terminating #{tournament_id}")
    end
  end
end
