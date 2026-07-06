defmodule Codebattle.Bot.PlaybookPlayerTest do
  use Codebattle.IntegrationCase, async: false

  alias Codebattle.Bot
  alias Codebattle.Bot.PlaybookPlayer
  alias Codebattle.Game
  alias Codebattle.Game.Helpers
  alias Codebattle.Task
  alias CodebattleWeb.GameChannel
  alias CodebattleWeb.UserSocket

  @bot_id 777

  @python_solution """
  import sys


  def solution(a, b):
      result = a + b
      return result
  """

  describe "init/1 and next_step/1" do
    test "types the python solution incrementally and submits it at the end" do
      {:ok, params} = PlaybookPlayer.init(%{game: build_game(), bot_id: @bot_id})

      assert params.lang == "python"

      steps = collect_steps(params)
      commands = Enum.map(steps, & &1.step_command)
      texts = Enum.map(steps, fn step -> elem(step.editor_state, 0) end)

      # every step but the last one types into the editor, the last one submits
      assert List.last(commands) == :check_result
      assert commands |> Enum.drop(-1) |> Enum.all?(&(&1 == :update_editor))

      # every typed text is a growing prefix of the solution, ending with the full one
      assert Enum.all?(texts, &String.starts_with?(@python_solution, &1))
      assert texts == Enum.sort_by(texts, &String.length/1)
      assert List.last(texts) == @python_solution
    end

    test "spends time_to_solve_sec - 5s typing before submitting" do
      {:ok, params} = PlaybookPlayer.init(%{game: build_game(%{time_to_solve_sec: 100}), bot_id: @bot_id})

      assert params.bot_time_ms == 95_000

      steps = collect_steps(params)
      typing_steps = Enum.drop(steps, -1)
      total_typing_ms = typing_steps |> Enum.map(& &1.step_timeout_ms) |> Enum.sum()

      # integer division loses at most (steps - 1) ms across the run
      assert_in_delta total_typing_ms, 95_000, length(typing_steps)
      # the final submission fires right after the last keystroke
      assert List.last(steps).step_timeout_ms == 0
    end

    test "falls back to 3 minutes when the task has no time_to_solve_sec" do
      {:ok, params} = PlaybookPlayer.init(%{game: build_game(%{time_to_solve_sec: nil}), bot_id: @bot_id})

      assert params.bot_time_ms == 175_000
    end

    test "returns an error when the task has no python solution" do
      assert PlaybookPlayer.init(%{game: build_game(%{solutions: %{}}), bot_id: @bot_id}) ==
               {:error, :no_solution}

      assert PlaybookPlayer.init(%{game: build_game(%{solutions: %{"js" => "x"}}), bot_id: @bot_id}) ==
               {:error, :no_solution}
    end
  end

  describe "playing a real game" do
    test "the bot types the task's python solution into the editor", %{conn: conn} do
      task = insert(:task, level: "easy", time_to_solve_sec: 30, solutions: %{"python" => @python_solution})
      user = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1400})

      conn = put_session(conn, :user_id, user.id)
      socket = socket(UserSocket, "user_id", %{user_id: user.id, current_user: user})

      bot = Bot.Context.build()

      {:ok, game} =
        Game.Context.create_game(%{
          state: "waiting_opponent",
          type: "duo",
          mode: "standard",
          visibility_type: "public",
          level: "easy",
          task: task,
          players: [bot]
        })

      game_topic = "game:#{game.id}"

      :timer.sleep(100)
      post(conn, Routes.game_path(conn, :join, game.id))
      :timer.sleep(100)

      {:ok, _response, _socket} = subscribe_and_join(socket, GameChannel, game_topic)

      # 30s task => bot spends 25s typing, so after ~3s it has typed a prefix
      :timer.sleep(3_000)

      game = Game.Context.get_game!(game.id)
      assert game.state == "playing"

      bot_editor_text = Helpers.get_first_player(game).editor_text

      assert bot_editor_text != ""
      assert String.starts_with?(@python_solution, bot_editor_text)
    end
  end

  defp build_game(task_attrs \\ %{}) do
    task =
      struct(
        Task,
        Map.merge(
          %{solutions: %{"python" => @python_solution}, time_to_solve_sec: 100, level: "easy"},
          task_attrs
        )
      )

    %Game{
      task: task,
      players: [
        %Game.Player{id: @bot_id, is_bot: true},
        %Game.Player{id: 1, is_bot: false, rating: 1200}
      ]
    }
  end

  defp collect_steps(params), do: collect_steps(params, [])

  defp collect_steps(params, acc) do
    case PlaybookPlayer.next_step(params) do
      %{state: :finished} -> Enum.reverse(acc)
      %{state: :playing} = next -> collect_steps(next, [next | acc])
    end
  end
end
