defmodule Codebattle.Bot.ServerTest do
  use ExUnit.Case, async: true

  alias Codebattle.Bot.Server
  alias Codebattle.Game
  alias Codebattle.PubSub.Message

  @bot_id 42

  test "stops writing and congratulates the opponent when the game finishes" do
    state = state(%{mode: "training"})

    event = %Message{
      topic: "game:1",
      event: "game:finished",
      payload: %{game_id: 1, game_state: "game_over", winner_id: 7}
    }

    assert {:noreply, stopped_state} = Server.handle_info(event, state)
    assert stopped_state.state == :finished

    assert_receive {:"$gen_cast",
                    {:push, "chat:add_msg",
                     %{
                       "text" =>
                         "Congratulations! You win training game. Now you can register and fight for a place in the ranking."
                     }}}

    assert {:noreply, ^stopped_state} = Server.handle_info(:next_bot_step, stopped_state)
    assert {:noreply, ^stopped_state} = Server.handle_info(:say_about_code, stopped_state)
    refute_receive {:"$gen_cast", {:push, _event, _payload}}
  end

  test "does not congratulate when the bot wins" do
    event = %Message{
      topic: "game:1",
      event: "game:finished",
      payload: %{game_id: 1, game_state: "game_over", winner_id: @bot_id}
    }

    assert {:noreply, stopped_state} = Server.handle_info(event, state())
    assert stopped_state.state == :finished
    refute_receive {:"$gen_cast", {:push, "chat:add_msg", _payload}}
  end

  test "does not congratulate when the game times out without a winner" do
    event = %Message{
      topic: "game:1",
      event: "game:finished",
      payload: %{game_id: 1, game_state: "timeout", winner_id: nil}
    }

    assert {:noreply, stopped_state} = Server.handle_info(event, state())
    assert stopped_state.state == :finished
    refute_receive {:"$gen_cast", {:push, "chat:add_msg", _payload}}
  end

  defp state(game_params \\ %{}) do
    %{
      state: :playing,
      game: struct!(Game, Map.merge(%{id: 1}, game_params)),
      bot_id: @bot_id,
      game_channel: self(),
      chat_channel: self(),
      playbook_params: nil
    }
  end
end
