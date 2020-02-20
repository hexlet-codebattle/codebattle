defmodule Codebattle.GameProcess.GlobalSupervisor do
  @moduledoc false

  require Logger

  use DynamicSupervisor

  alias Codebattle.GameProcess.ActiveGames
  alias Codebattle.GameProcess.FsmHelpers

  def start_link do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_game(fsm) do
    game_id = FsmHelpers.get_game_id(fsm)
    spec = {Codebattle.GameProcess.Supervisor, [game_id, fsm]}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  @impl true
  def init(_) do
    ActiveGames.init()
    DynamicSupervisor.init(strategy: :one_for_one)
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
