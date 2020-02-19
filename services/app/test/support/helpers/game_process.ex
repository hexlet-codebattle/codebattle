defmodule Helpers.GameProcess do
  @moduledoc """
  Test helpers for GameProcess context
  """

  import CodebattleWeb.Factory

  alias Codebattle.GameProcess.{Server, GlobalSupervisor, Fsm, ActiveGames}

  def setup_game(state, data) do
    # TODO: FIXME
    game = insert(:game)
    task = Map.get(data, :task, game.task)
    players = Map.get(data, :players, game)

    data = Map.put(data, :game_id, game.id)
    data = Map.put(data, :task, task)
    data = Map.put(data, :level, task.level)
    data = Map.put(data, :starts_at, TimeHelper.utc_now())
    fsm = Fsm.set_data(state, data)
    ActiveGames.setup_game(fsm)
    GlobalSupervisor.start_game(game.id, fsm)
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
