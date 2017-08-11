defmodule Play.Supervisor do
  @moduledoc false

  use Supervisor

  def start_link do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_game(game_id, state) do
    Supervisor.start_child(__MODULE__, [game_id, state])
  end

  def init(_) do
    children = [
      worker(Play.Server, [])
    ]
    supervise(children, strategy: :simple_one_for_one)
  end

  def current_games do
    __MODULE__
    |> Supervisor.which_children
    |> Enum.map(&game_id/1)
    |> Enum.map(fn(id) -> Codebattle.Repo.get(Codebattle.Game, id) |> Codebattle.Repo.preload([:users]) end)
  end

  defp game_id({_id, pid, _type, _modules}) do
    pid
    |> GenServer.call(:state)
    |> Map.get(:data)
    |> Map.get(:id)
  end
end
