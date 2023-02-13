defmodule Codebattle.Game.GlobalSupervisor do
  use Supervisor

  alias Codebattle.Game

  require Logger

  def start_link(_) do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    Supervisor.init([], strategy: :one_for_one)
  end

  def start_game(game) do
    Supervisor.start_child(
      __MODULE__,
      %{
        id: to_string(game.id),
        restart: :transient,
        start: {Game.Supervisor, :start_link, [game]}
      }
    )
  end

  def terminate_game(game_id) do
    try do
      Supervisor.terminate_child(__MODULE__, to_string(game_id))
    rescue
      _ -> Logger.error("cannot  terminate game #{game_id}")
    end
  end
end
