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

  test "creates solo games and joins a second player to waiting games" do
    creator = insert(:user)
    opponent = insert(:user)

    assert {:ok, solo} =
             Game.Engine.create_game(%{
               players: [creator],
               type: "solo",
               mode: "training",
               level: "easy"
             })

    assert solo.state == "playing"
    assert length(solo.players) == 1

    assert {:ok, waiting} =
             Game.Engine.create_game(%{
               players: [creator],
               type: "duo",
               mode: "training",
               level: "easy"
             })

    assert waiting.state == "waiting_opponent"
    assert {:ok, joined} = Game.Engine.join_game(waiting, opponent)
    assert joined.state == "playing"
    assert joined.players |> Enum.map(& &1.id) |> Enum.sort() == Enum.sort([creator.id, opponent.id])
  end

  test "checks a partial solution and records it as a failed attempt" do
    user1 = insert(:user)
    user2 = insert(:user)

    {:ok, game} = Game.Engine.create_game(%{players: [user1, user2], state: "playing", level: "easy"})

    assert {:ok, checked_game, %{solution_status: false, check_result: result}} =
             Game.Engine.check_result(game, %{
               user: user1,
               editor_text: "solve_percent_33",
               editor_lang: "js"
             })

    assert result.status != "ok"
    assert checked_game.state == "playing"
  end

  test "propagates transition errors while a live server is frozen" do
    user1 = insert(:user)
    user2 = insert(:user)
    {:ok, game} = Game.Engine.create_game(%{players: [user1, user2], state: "playing", level: "easy"})

    assert :ok = Game.Server.freeze(game.id)

    assert {:error, :handoff_in_progress} =
             Game.Engine.update_editor_data(game, %{id: user1.id, editor_text: "x", editor_lang: "js"})

    assert {:error, :handoff_in_progress} = Game.Engine.rematch_reject(game)
    assert :ok = Game.Server.unfreeze(game.id)
  end

  test "updates editor state, bans a player, and handles an already finished timeout" do
    user1 = insert(:user)
    user2 = insert(:user)
    {:ok, game} = Game.Engine.create_game(%{players: [user1, user2], state: "playing", level: "easy"})

    assert {:ok, edited} =
             Game.Engine.update_editor_data(game, %{id: user1.id, editor_text: "answer", editor_lang: "js"})

    assert Enum.find(edited.players, &(&1.id == user1.id)).editor_text == "answer"
    assert {:ok, banned} = Game.Engine.toggle_ban_player(edited, user2.id)
    assert Enum.find(banned.players, &(&1.id == user2.id)).is_banned

    assert {:ok, finished} = Game.Engine.give_up(banned, user1)
    assert finished.state == "game_over"
    assert {:ok, ^finished} = Game.Engine.trigger_timeout(finished)
  end

  test "persists the selected editor type after CSS and SQL games" do
    user = insert(:user, subscription_type: :premium, style_lang: "sass", db_type: "mysql")

    for {task_type, field, expected} <- [{"css", :style_lang, "sass"}, {"sql", :db_type, "mysql"}] do
      {:ok, game} =
        Game.Engine.create_game(%{
          task: %{type: task_type},
          players: [user],
          mode: "training"
        })

      finished = %{
        game
        | state: "game_over",
          players:
            Enum.map(game.players, fn player ->
              if player.id == user.id, do: %{player | result: "gave_up"}, else: %{player | result: "won"}
            end)
      }

      assert {:ok, _stored} = Game.Engine.store_result!(finished)
      assert Map.fetch!(Codebattle.User.get!(user.id), field) == expected
    end
  end

  test "returns an unpersisted game unchanged from update_game!/2" do
    game = %Game{id: System.unique_integer([:positive]), state: "playing"}
    assert Game.Engine.update_game!(game, %{state: "canceled"}) == game
  end

  test "supports asynchronous playbook storage" do
    previous = Application.get_env(:codebattle, :store_playbook_async)
    Application.put_env(:codebattle, :store_playbook_async, true)
    on_exit(fn -> Application.put_env(:codebattle, :store_playbook_async, previous) end)

    user = insert(:user)

    {:ok, game} =
      Game.Engine.create_game(%{players: [user], type: "solo", mode: "training", level: "easy"})

    assert {:ok, _pid} = Game.Engine.store_playbook_async(game)
  end

  test "stores guest-marked player results without updating the user profile" do
    guest_user = insert(:user, rating: 777)
    opponent = insert(:user)
    task = insert(:task)

    game =
      insert(:game,
        task: task,
        state: "game_over",
        players: [
          Game.Player.build(guest_user, %{is_guest: true, result: "lost"}),
          Game.Player.build(opponent, %{result: "won"})
        ]
      )

    assert {:ok, _stored} = Game.Engine.store_result!(game)
    assert Codebattle.User.get!(guest_user.id).rating == 777
  end
end
