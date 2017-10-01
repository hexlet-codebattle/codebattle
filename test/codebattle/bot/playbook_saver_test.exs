defmodule Codebattle.PlaybookSaverTest do
  use Codebattle.IntegrationCase

  alias CodebattleWeb.GameChannel
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo

  setup do
    user1 = insert(:user)
    user2 = insert(:user)

   socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})
   socket2 = socket("user_id", %{user_id: user2.id, current_user: user2})

    # user_token1 = Phoenix.Token.sign(socket(), "user_token", user1.id)
    # # {:ok, socket1} = connect(CodebattleWeb.UserSocket, %{"token" => user_token1})

    # user_token2 = Phoenix.Token.sign(socket(), "user_token", user2.id)
    # # {:ok, socket2} = connect(CodebattleWeb.UserSocket, %{"token" => user_token2})

    {:ok, %{user1: user1, user2: user2, socket1: socket1, socket2: socket2}}
  end

  test "stores playbook to db from game winner editor", %{user1: user1, user2: user2, socket1: socket1, socket2: socket2} do
    #setup
    state = :playing
    data = %{first_player: user1, second_player: user2}
    game = setup_game(state, data)
    game_topic = "game:" <> to_string(game.id)
    editor_text1 = "t"
    editor_text2 = "te"
    editor_text3 = "tes"

    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
    :lib.flush_receive()

    push socket1, "editor:data", %{editor_text: editor_text1}
    :timer.sleep(100)
    push socket1, "editor:data", %{editor_text: editor_text2}
    :timer.sleep(100)
    push socket1, "editor:data", %{editor_text: editor_text3}
    :timer.sleep(100)

    push socket1, "check_result", %{editor_text: editor_text3}

    playbook = [
      %{delay: 0, diff: [%Diff.Modified{element: ["t"], index: 0, length: 1, old_element: [" "]}]},
      %{delay: 100, diff: [%Diff.Insert{element: ["e"], index: 1, length: 1}]},
      %{delay: 100, diff: [%Diff.Insert{element: ["s"], index: 2, length: 1}]},
    ]

    assert Repo.all(Playbook) == {}
  end
end
