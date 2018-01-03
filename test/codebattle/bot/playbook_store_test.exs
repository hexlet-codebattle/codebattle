defmodule Codebattle.Bot.PlaybookStoreTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.GameChannel
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo
  alias Codebattle.GameProcess.Player

  setup do
    user1 = insert(:user)
    user2 = insert(:user)
    task = build(:task, id: 1)

    Helpers.TimeStorage.start_link

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket("user_id", %{user_id: user2.id, current_user: user2})

    {:ok, %{user1: user1, user2: user2, task: task, socket1: socket1, socket2: socket2}}
  end

  test "stores player playbook if he is winner", %{user1: user1, user2: user2, task: task, socket1: socket1, socket2: socket2} do
    with_mocks([
      {NaiveDateTime, [], [
        diff: fn(_a, _b, _c) -> 100 end,
        utc_now: fn ->  Helpers.TimeStorage.next() end,
      ]},
      {Codebattle.CodeCheck.Checker, [], [
        check: fn(_a, _b, _c) -> {:ok, true} end
      ]}
    ]) do

    #setup
    state = :playing
    data = %{players: [%Player{id: user1.id, user: user1}, %Player{id: user2.id, user: user2}], task: task}
    game = setup_game(state, data)
      start_game_recorder(game.id, task.id, user1.id)
      game_topic = "game:" <> to_string(game.id)
      editor_text1 = "t"
      editor_text2 = "te"
      editor_text3 = "tes"

      {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)
      {:ok, _response, _socket2} = subscribe_and_join(socket2, GameChannel, game_topic)
      :lib.flush_receive()

      push socket1, "editor:text", %{editor_text: editor_text1}
      push socket1, "editor:text", %{editor_text: editor_text2}
      push socket1, "editor:text", %{editor_text: editor_text3}
      push socket1, "check_result", %{editor_text: editor_text3, lang: :js}

      playbook = [
        %{"delta" => [%{"insert" => "t"}], "time" => 100},
        %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 100},
        %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 100},
        %{"delta" => [], "time" => 100},
        %{"lang" => "js", "time" => 100},
        %{"delta" => [], "time" => 100},
        %{"lang" => "js", "time" => 100},
      ]

      # sleep, because GameProcess need time to write Playbook with Ecto.connection
      :timer.sleep(50)
      assert playbook == Repo.get_by(Playbook, user_id: user1.id).data["playbook"]
    end
  end
end

