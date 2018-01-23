defmodule Codebattle.GameProcess.GlobalSupervisor do
  @moduledoc false

  use Supervisor

  alias Codebattle.GameProcess.{Server, ActiveGames}

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

  def current_games do
    __MODULE__
    |> Supervisor.which_children()
    |> Enum.map(&game_state/1)
    |> Enum.filter(fn x -> x end)
  end

  def stop_game(game_id) do
    pid = Server.game_pid(game_id)
    Supervisor.terminate_child(__MODULE__, pid)
  end

  defp game_state({_id, pid, _type, _modules}) do
    pid
    |> GenServer.call(:fsm)
  end
end
