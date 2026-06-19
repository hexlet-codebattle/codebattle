defmodule Codebattle.PubSub.EventsTest do
  use Codebattle.DataCase

  alias Codebattle.Game.Player
  alias Codebattle.PubSub.Events

  describe "game:finished" do
    test "includes tournament game winner_id when a player won" do
      winner = build(:user, id: 1)
      loser = build(:user, id: 2)

      game = %Game{
        id: 123,
        tournament_id: 99,
        task_id: 7,
        ref: 3,
        state: "game_over",
        level: "easy",
        duration_sec: 42,
        timeout_seconds: 300,
        players: [
          Player.build(winner, %{result: "won"}),
          Player.build(loser, %{result: "lost"})
        ]
      }

      assert %{payload: %{winner_id: 1}} =
               game
               |> game_finished_messages()
               |> Enum.find(&(&1.topic == "game:tournament:99"))
    end

    test "includes nil tournament game winner_id when no player won" do
      user1 = build(:user, id: 1)
      user2 = build(:user, id: 2)

      game = %Game{
        id: 123,
        tournament_id: 99,
        task_id: 7,
        ref: 3,
        state: "timeout",
        level: "easy",
        duration_sec: nil,
        timeout_seconds: 300,
        players: [
          Player.build(user1, %{result: "timeout"}),
          Player.build(user2, %{result: "timeout"})
        ]
      }

      assert %{payload: %{winner_id: nil}} =
               game
               |> game_finished_messages()
               |> Enum.find(&(&1.topic == "game:tournament:99"))
    end
  end

  defp game_finished_messages(game), do: Events.get_messages("game:finished", %{game: game})
end
