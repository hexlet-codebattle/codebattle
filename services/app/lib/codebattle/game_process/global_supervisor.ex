defmodule Codebattle.GameProcess.GlobalSupervisor do
  @moduledoc false

  require Logger

  use Supervisor

  alias Codebattle.GameProcess.ActiveGames

  def start_link do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_game(game_id, fsm) do
    Supervisor.start_child(__MODULE__, [game_id, fsm])
  end

  def init(_) do
    children = [
      supervisor(Codebattle.GameProcess.Supervisor, [])
    ]

    ActiveGames.new()
    supervise(children, strategy: :simple_one_for_one)
  end

  def terminate_game(game_id) do
    pid = Codebattle.GameProcess.Supervisor.get_pid(game_id)

    try do
      Supervisor.terminate_child(__MODULE__, pid)
    rescue
      _ -> Logger.error("game not found")
    end
  end
end
