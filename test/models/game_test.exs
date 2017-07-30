defmodule Codebattle.GameTest do
  use Codebattle.ModelCase

  alias CodebattleWeb.Game

  describe "state mashine" do
    test "initial state" do
      game = %Game{}
      assert game.state == "initial"
    end

    test "event create" do
      game = %Game{state: "initial"}
      new_game = Game.create(game)
      assert new_game.changes.state == "waiting_oponent"
    end

    test "event start" do
      game = %Game{state: "waiting_oponent"}
      new_game = Game.start(game)
      assert new_game.changes.state == "playing"
    end

    test "event won" do
      game = %Game{state: "playing"}
      new_game = Game.won(game)
      assert new_game.changes.state == "one_player_won"
    end

    test "event finish" do
      game = %Game{state: "one_player_won"}
      new_game = Game.finish(game)
      assert new_game.changes.state == "finished"
    end
  end
end
