defmodule Codebattle.Game.GlobalSupervisor do
  @moduledoc false

  require Logger

  use DynamicSupervisor

  alias Codebattle.Game.ActiveGames
  alias Codebattle.Game.Helpers

  def start_link(_) do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def start_game(fsm) do
    game_id = Helpers.get_game_id(fsm)
    spec = {Codebattle.Game.Supervisor, {game_id, fsm}}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  @impl true
  def init(_) do
    ActiveGames.init()
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def terminate_game(game_id) do
    pid = Codebattle.Game.Supervisor.get_pid(game_id)

    try do
      DynamicSupervisor.terminate_child(__MODULE__, pid)
    rescue
      _ -> Logger.info("game not found")
    end
  end
end
