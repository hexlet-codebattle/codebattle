defmodule Helpers.GameProcess do
  @moduledoc """
  Test helpers for GameProcess context
  """

  import CodebattleWeb.Factory

  alias Codebattle.GameProcess.{Supervisor, Fsm}

  def setup_game(state, data) do
    game = insert(:game)
    data = Map.put(data, :game_id, game.id)
    fsm = Fsm.set_data(state, data)
    Supervisor.start_game(game.id, fsm)
    game
  end

  def start_game_recorder(game_id, task_id, user_id) do
    Codebattle.Bot.RecorderServer.start(game_id, task_id, user_id)
  end
end
