defmodule Codebattle.Game.FsmTest do
  use ExUnit.Case, async: true

  alias Codebattle.CodeCheck.Result.V2
  alias Codebattle.Game
  alias Codebattle.Game.Fsm
  alias Codebattle.Game.Player

  defp game(attrs \\ %{}) do
    struct!(
      Game,
      Map.merge(
        %{
          state: "playing",
          starts_at: TimeHelper.utc_now(),
          rematch_state: "none",
          locked: true,
          players: [
            %Player{id: 1, name: "one"},
            %Player{id: 2, name: "two"}
          ]
        },
        attrs
      )
    )
  end

  test "ignores late checks and tournament give-up events" do
    timeout = game(%{state: "timeout"})
    tournament = game(%{tournament_id: 10})

    assert Fsm.transition(:check_success, timeout, %{}) == {:ok, timeout}
    assert Fsm.transition(:check_failure, timeout, %{}) == {:ok, timeout}
    assert Fsm.transition(:give_up, tournament, %{id: 1}) == {:ok, tournament}
  end

  test "records failed checks while a game can still receive editor results" do
    check_result = %V2{success_count: 1, asserts_count: 2, status: "failure"}

    assert {:ok, updated} =
             Fsm.transition(:check_failure, game(), %{
               id: 1,
               check_result: check_result,
               editor_text: "solution",
               editor_lang: "elixir"
             })

    player = Enum.find(updated.players, &(&1.id == 1))
    assert player.check_result == check_result
    assert player.editor_text == "solution"
    assert player.result_percent == 50.0
  end

  test "handles terminal timeouts, unlocking, bans, and unknown transitions" do
    game_over = game(%{state: "game_over"})
    timeout = game(%{state: "timeout"})

    assert Fsm.transition(:timeout, game_over, %{}) == {:ok, game_over}
    assert Fsm.transition(:timeout, timeout, %{}) == {:ok, timeout}
    assert {:ok, unlocked} = Fsm.transition(:unlock_game, game(), %{})
    refute unlocked.locked

    assert {:ok, banned} = Fsm.transition(:toggle_ban_player, game(), %{id: 1})
    assert Enum.find(banned.players, &(&1.id == 1)).is_banned
    refute Enum.find(banned.players, &(&1.id == 2)).is_banned

    assert Fsm.transition(:unsupported, game(), %{value: 1}) == {:error, "Unknown transition"}
  end

  test "leaves rematch state unchanged after an offer was already rejected" do
    rejected = game(%{state: "game_over", rematch_state: "rejected"})
    assert {:ok, unchanged} = Fsm.transition(:rematch_send_offer, rejected, %{player_id: 1})
    assert unchanged.rematch_state == "rejected"
  end
end
