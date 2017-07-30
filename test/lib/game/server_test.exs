defmodule Game.ServerTest do
  use ExUnit.Case

  doctest Game.Server

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Codebattle.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Codebattle.Repo, {:shared, self()})
  end

  test "user create game" do
    {:ok, game} = Codebattle.Repo.insert(%CodebattleWeb.Game{})
    user = %CodebattleWeb.User{}

    Game.Supervisor.start_game(game)
    Game.Server.fire_event(game.id, user, :create)

    assert Codebattle.Repo.get(CodebattleWeb.Game, game.id).state == "waiting_oponent"
  end
end
