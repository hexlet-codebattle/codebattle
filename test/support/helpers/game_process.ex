defmodule Helpers.GameProcess do
  @moduledoc """
    Test helpers for GameProcess context
  """

  import CodebattleWeb.Factory

  alias Codebattle.GameProcess.{Supervisor, Fsm}

  def setup_game(state, data) do
    game = insert(:game)

    fsm = Fsm.set_data(state, data)
    Supervisor.start_game(game.id, fsm)
    game
  end
end
