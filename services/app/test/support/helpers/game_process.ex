defmodule Helpers.GameProcess do
  @moduledoc """
  Test helpers for GameProcess context
  """

  import CodebattleWeb.Factory

  alias Codebattle.GameProcess.{Server, GlobalSupervisor, Fsm, ActiveGames}

  def setup_game(state, data) do
    game = insert(:game)
    task = Map.get(data, :task, game.task)
    players = Map.get(data, :players, game)

    fsm =
      Fsm.new()
      |> Fsm.create(%{
        game_id: game.id,
        players: players,
        task: task,
        level: task.level,
        starts_at: TimeHelper.utc_now(),
        state: state
      })

    ActiveGames.setup_game(fsm)
    GlobalSupervisor.start_game(fsm)
    Server.update_playbook(game.id, :join, %{players: players})
    game
  end

  def game_id_from_conn(conn) do
    location =
      conn.resp_headers
      |> Enum.find(&match?({"location", _}, &1))
      |> elem(1)

    ~r/\d+/
    |> Regex.run(location)
    |> List.first()
    |> String.to_integer()
  end
end
