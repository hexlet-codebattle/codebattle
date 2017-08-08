defmodule Play.Supervisor do
  @moduledoc false

  use Supervisor

  def start_link do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_game(game_id) do
    Supervisor.start_child(__MODULE__, [game_id])
  end

  def init(_) do
    children = [
      worker(Play.Server, [])
    ]
    supervise(children, strategy: :simple_one_for_one)
  end
end
