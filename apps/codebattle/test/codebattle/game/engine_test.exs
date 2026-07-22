defmodule Codebattle.Game.EngineTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Game

  test "creates CSS and SQL experiment games with their specialized tasks" do
    user = insert(:user, subscription_type: :premium)

    for task_type <- ["css", "sql"] do
      assert {:ok, game} =
               Game.Engine.create_game(%{
                 task: %{type: task_type},
                 players: [user],
                 mode: "training",
                 timeout_seconds: 20_000,
                 locked: true,
                 award: "experiment",
                 use_chat: false,
                 use_timer: false,
                 visibility_type: "hidden"
               })

      on_exit(fn -> Game.GlobalSupervisor.terminate_game(game.id) end)

      assert game.state == "playing"
      assert game.task_type == task_type
      assert game.timeout_seconds == 7_200
      assert game.locked
      assert game.award == "experiment"
      assert game.use_chat == false
      assert game.use_timer == false
      assert game.visibility_type == "hidden"
      assert Enum.any?(game.players, &(&1.id == user.id and &1.creator))
      assert Enum.any?(game.players, & &1.is_bot)

      case task_type do
        "css" -> assert game.css_task.creator_id == user.id
        "sql" -> assert game.sql_task.creator_id == user.id
      end
    end
  end
end
