defmodule Codebattle.Bot.PlaybookStoreTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.GameChannel
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo

  setup do
    user1 = insert(:user)
    user2 = insert(:user)

    Helpers.TimeStorage.start_link

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket("user_id", %{user_id: user2.id, current_user: user2})

    {:ok, %{user1: user1, user2: user2, socket1: socket1, socket2: socket2}}
  end

  test "stores first player playbook if he is winner", %{user1: user1, user2: user2, socket1: socket1, socket2: socket2} do
    with_mocks([
      {NaiveDateTime, [], [
        diff: fn(_a, _b, _c) -> 100 end,
        utc_now: fn ->  Helpers.TimeStorage.next() end,
      ]},
      {Codebattle.CodeCheck.Checker, [], [
        check: fn(_a, _b) -> {:ok, true} end
      ]}
    ]) do

    #setup
    state = :playing
    data = %{first_player: user1, second_player: user2}
    game = setup_game(state, data)
      game_topic = "game:" <> to_string(game.id)
      editor_text1 = "t"
      editor_text2 = "te"
      editor_text3 = "tes"

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      :lib.flush_receive()

      push socket1, "editor:data", %{editor_text: editor_text1}
      push socket1, "editor:data", %{editor_text: editor_text2}
      push socket1, "editor:data", %{editor_text: editor_text3}
      push socket1, "check_result", %{editor_text: editor_text3}

      playbook = [
        %{"time" => 100, "diff" => inspect([%Diff.Modified{element: ["t"], index: 0, length: 1, old_element: [" "]}])},
        %{"time" => 100, "diff" => inspect([%Diff.Insert{element: ["e"], index: 1, length: 1}])},
        %{"time" => 100, "diff" => inspect([%Diff.Insert{element: ["s"], index: 2, length: 1}])},
        %{"time" => 100, "diff" => inspect([])},
      ]

      # sleep, because GameProcess need time to write Playbook with Ecto.connection
      :timer.sleep(50)
      assert playbook == Repo.get_by(Playbook, user_id: user1.id).data["playbook"]
    end
  end

  test "stores second player playbook if he is winner", %{user1: user1, user2: user2, socket1: socket1, socket2: socket2} do
    with_mocks([
      {NaiveDateTime, [], [
        diff: fn(_a, _b, _c) -> 100 end,
        utc_now: fn ->  Helpers.TimeStorage.next() end,
      ]},
      {Codebattle.CodeCheck.Checker, [], [
        check: fn(_a, _b) -> {:ok, true} end
      ]}
    ]) do

      #setup
      state = :playing
      data = %{first_player: user1, second_player: user2}
      game = setup_game(state, data)
      game_topic = "game:" <> to_string(game.id)
      editor_text1 = "t"
      editor_text2 = "te"
      editor_text3 = "tes"

      {:ok, _response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      :lib.flush_receive()

      push socket2, "editor:data", %{editor_text: editor_text1}
      push socket2, "editor:data", %{editor_text: editor_text2}
      push socket2, "editor:data", %{editor_text: editor_text3}
      push socket2, "check_result", %{editor_text: editor_text3}

      playbook = [
        %{"time" => 100, "diff" => inspect([%Diff.Modified{element: ["t"], index: 0, length: 1, old_element: [" "]}])},
        %{"time" => 100, "diff" => inspect([%Diff.Insert{element: ["e"], index: 1, length: 1}])},
        %{"time" => 100, "diff" => inspect([%Diff.Insert{element: ["s"], index: 2, length: 1}])},
        %{"time" => 100, "diff" => inspect([])},
      ]

      # sleep, because GameProcess need time to write Playbook with Ecto.connection
      :timer.sleep(50)
      assert playbook == Repo.get_by(Playbook, user_id: user2.id).data["playbook"]
    end
  end

  @tag :pending
  test "stores null", %{user1: user1, user2: user2, socket1: socket1, socket2: socket2} do
    with_mocks([{NaiveDateTime, [], [
      diff: fn(_a, _b, _c) -> 100 end,
      utc_now: fn ->  Helpers.TimeStorage.next() end,
    ]}]) do

      #setup
      state = :playing
      data = %{first_player: user1, second_player: user2}
      game = setup_game(state, data)
      game_topic = "game:" <> to_string(game.id)

      {:ok, _response, _socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      :lib.flush_receive()

      push socket2, "check_result", %{editor_text: ''}

      playbook = [
        %{"time" => 100, "diff" => inspect([%Diff.Modified{element: ["t"], index: 0, length: 1, old_element: [" "]}])},
        %{"time" => 100, "diff" => inspect([%Diff.Insert{element: ["e"], index: 1, length: 1}])},
        %{"time" => 100, "diff" => inspect([%Diff.Insert{element: ["s"], index: 2, length: 1}])},
        %{"time" => 100, "diff" => inspect([])},
      ]

      # sleep, because GameProcess need time to write Playbook with Ecto.connection
      :timer.sleep(50)
      assert playbook == Repo.get_by(Playbook, user_id: user2.id).data["playbook"]
    end
  end
end

