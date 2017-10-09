defmodule Codebattle.PlaybookPlayTest do
  use Codebattle.IntegrationCase

  import Mock

  alias CodebattleWeb.GameChannel
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo

  setup do
    playbook_data = %{playbook: [
      %{"time" => Time.new(1,2,3,100), "diff" => inspect([%Diff.Modified{element: ["t"], index: 0, length: 1, old_element: [" "]}])},
      %{"time" => Time.new(1,2,3,200), "diff" => inspect([%Diff.Insert{element: ["e"], index: 1, length: 1}])},
      %{"time" => Time.new(1,2,3,300), "diff" => inspect([%Diff.Insert{element: ["s"], index: 2, length: 1}])},
      %{"time" => Time.new(1,2,3,400), "diff" => inspect([])},
    ]}

    user1 = insert(:user)
    user2 = insert(:user)
    task = insert(:task)

    insert(:bot_playbook, %{data: playbook_data, task_id: task.id, user_id: user2.id})

    conn1 = assign(build_conn(), :user, user1)

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})

    {:ok, %{user1: user1, user2: user2, socket1: socket1, conn1: conn1, task: task}}
  end

  @tag :pending
  test "plays with bot if nobody join game", %{user1: user1, user2: user2, socket1: socket1, conn1: conn1} do
  end
end

