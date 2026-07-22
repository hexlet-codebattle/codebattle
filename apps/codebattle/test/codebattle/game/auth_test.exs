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

    test "rejects guests and stops a mixed player list at the first error" do
      guest = %{id: -1, is_guest: true, is_bot: false}
      bot = %{id: -2, is_guest: false, is_bot: true}

      assert {:error, :not_authorized} = Auth.player_can_play_game?(guest)
      assert {:error, :not_authorized} = Auth.player_can_play_game?([bot, guest])
    end
  end

  test "allows only a participating player to cancel a waiting game" do
    player = %{id: 1}
    waiting = %{state: "waiting_opponent", players: [%{id: 1}]}
    playing = %{state: "playing", players: [%{id: 1}]}

    assert :ok = Auth.player_can_cancel_game?(waiting, player)
    assert {:error, :not_authorized} = Auth.player_can_cancel_game?(waiting, %{id: 2})
    assert {:error, :only_waiting_opponent} = Auth.player_can_cancel_game?(playing, player)
  end
end
