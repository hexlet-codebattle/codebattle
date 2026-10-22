defmodule Codebattle.Bot.ServerTest do
  use ExUnit.Case, async: true

  alias Codebattle.Bot.Server
  alias Codebattle.Game
  alias Codebattle.PubSub.Message

  @bot_id 42

  test "stops writing and congratulates the opponent when the game finishes" do
    state = state(%{mode: "training"})

    assert {:noreply, stopped_state} = Server.handle_info(finished(7), state)
    assert stopped_state.state == :finished

    assert_receive {:"$gen_cast",
                    {:push, "chat:g_1", "chat:add_msg",
                     %{
                       "text" =>
                         "Congratulations, you won the training game! Sign up to fight for a place in the ranking."
                     }}}

    assert {:noreply, ^stopped_state} = Server.handle_info(:next_bot_step, stopped_state)
    refute_receive {:"$gen_cast", {:push, _topic, _event, _payload}}
  end

  test "speaks the opponent's locale" do
    state = state(%{mode: "training"}, locale: "ru")

    assert {:noreply, _state} = Server.handle_info(finished(7), state)

    assert_receive {:"$gen_cast", {:push, "chat:g_1", "chat:add_msg", %{"text" => "Поздравляю с победой" <> _rest}}}
  end

  test "does not congratulate when the bot wins" do
    assert {:noreply, stopped_state} = Server.handle_info(finished(@bot_id), state())
    assert stopped_state.state == :finished
    refute_receive {:"$gen_cast", {:push, "chat:g_1", "chat:add_msg", _payload}}
  end

  test "does not congratulate when the game times out without a winner" do
    event = %Message{
      topic: "game:1",
      event: "game:finished",
      payload: %{game_id: 1, game_state: "timeout", winner_id: nil}
    }

    assert {:noreply, stopped_state} = Server.handle_info(event, state())
    assert stopped_state.state == :finished
    refute_receive {:"$gen_cast", {:push, "chat:g_1", "chat:add_msg", _payload}}
  end

  test "stays quiet while the opponent checks solutions" do
    event = %Message{
      topic: "game:1",
      event: "user:check_complete",
      payload: %{"check_result" => %{"status" => "ok"}}
    }

    assert {:noreply, _state} = Server.handle_info(event, state())
    refute_receive {:"$gen_cast", {:push, _topic, _event, _payload}}
  end

  test "invites to the next tournament instead of the usual farewell, once per game" do
    invite = %{tournament_id: 5, starts_at: DateTime.add(DateTime.utc_now(), 90, :minute)}
    state = state(%{}, tournament_invite: invite)

    assert {:noreply, state} = Server.handle_info(%Message{topic: "game:1", event: "user:give_up", payload: %{}}, state)
    assert_receive {:"$gen_cast", {:push, "chat:g_1", "chat:add_msg", %{"text" => text}}}
    assert text =~ "/tournaments/5"
    assert text =~ ~r/in 1 h (29|30) min/

    assert {:noreply, _state} = Server.handle_info(finished(@bot_id), state)
    refute_receive {:"$gen_cast", {:push, _topic, _event, _payload}}
  end

  defp finished(winner_id) do
    %Message{
      topic: "game:1",
      event: "game:finished",
      payload: %{game_id: 1, game_state: "game_over", winner_id: winner_id}
    }
  end

  defp state(game_params \\ %{}, chat \\ []) do
    %{
      state: :playing,
      game: struct!(Game, Map.merge(%{id: 1}, game_params)),
      bot_id: @bot_id,
      game_channel: {self(), "game:1"},
      chat_channel: {self(), "chat:g_1"},
      playbook_params: nil,
      locale: Keyword.get(chat, :locale, "en"),
      opponent_id: nil,
      tournament_invite: Keyword.get(chat, :tournament_invite),
      said_goodbye: false
    }
  end
end
