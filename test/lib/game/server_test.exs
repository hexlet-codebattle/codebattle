defmodule Game.ServerTest do
  use ExUnit.Case

  doctest Game.Server

  setup do
    # Explicitly get a connection before each test
    # By default the test is wrapped in a transaction
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Codebattle.Repo)

    # The :shared mode allows a process to share
    # its connection with any other process automatically
    Ecto.Adapters.SQL.Sandbox.mode(Codebattle.Repo, { :shared, self() })
  end

  test "user create game" do
    {:ok, game} = Codebattle.Repo.insert(%Codebattle.Game{})
    user = %Codebattle.User{}

    Game.Supervisor.start_game(game)
    Game.Server.fire_event(game.id, user, :create)

    assert Codebattle.Repo.get(Codebattle.Game, game.id).state == "waiting_oponent"
  end
end
