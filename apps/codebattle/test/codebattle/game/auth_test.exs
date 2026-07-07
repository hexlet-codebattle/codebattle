defmodule Codebattle.Game.AuthTest do
  use Codebattle.DataCase

  alias Codebattle.Game
  alias Codebattle.Game.Auth

  describe "player_can_play_game?/1" do
    test "does not treat canonical bot participation as a blocking active game" do
      insert(:task, level: "easy")

      bot = insert(:user, is_bot: true)
      human = insert(:user)

      {:ok, _game} =
        Game.Context.create_game(%{
          state: "playing",
          players: [human, bot],
          level: "easy"
        })

      assert :ok = Auth.player_can_play_game?(%{id: bot.id, is_bot: false})
    end
  end
end
