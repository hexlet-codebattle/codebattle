defmodule Codebattle.Bot.PlaybookPlayer do
  @moduledoc """
  Simulates a bot solving a task.

  Instead of replaying recorded games (playbooks), the bot takes the task's
  stored reference solution from the database (`task.solutions["python"]`) and
  "types" it into the editor like a human, submitting the final solution after
  `time_to_solve_sec - 5s`.
  """

  alias Codebattle.Bot
  alias Codebattle.Bot.PlaybookPlayer.Params
  alias Codebattle.Game

  require Logger

  defmodule Params do
    @moduledoc false
    # `steps` is the precomputed list of actions the bot performs, each shaped as:
    #
    #   %{command: :update_editor, text: "partial solution", timeout_ms: 1500}
    #   %{command: :check_result,  text: "full solution",    timeout_ms: 0}
    #
    # `next_step/1` pops one step at a time, exposing `step_command`,
    # `editor_state` and `step_timeout_ms` for `Bot.Server` to act on.

    @type command :: :update_editor | :check_result
    @type step :: %{
            required(:command) => command(),
            required(:text) => String.t(),
            required(:timeout_ms) => non_neg_integer()
          }

    @type t :: %__MODULE__{
            state: :playing | :finished | nil,
            steps: [step()] | nil,
            lang: String.t() | nil,
            bot_time_ms: non_neg_integer() | nil,
            step_command: command() | nil,
            step_timeout_ms: non_neg_integer() | nil,
            editor_state: {String.t(), String.t()} | nil
          }

    defstruct ~w(
      state
      steps
      lang
      bot_time_ms
      step_command
      step_timeout_ms
      editor_state
    )a
  end

  # The bot submits a bit earlier than the full allotted time, so it looks like
  # a human who finished with a few seconds to spare.
  @submit_buffer_ms to_timeout(second: 5)

  # Fallback when a task has no `time_to_solve_sec` (should not happen: the column
  # is NOT NULL with a default, but we stay defensive).
  @fallback_time_ms to_timeout(minute: 3)

  # Lower bound for the total typing time, so tiny `time_to_solve_sec` values
  # don't make the bot submit instantly.
  @min_total_time_ms to_timeout(second: 5)

  # Roughly how many characters the bot "types" per editor update. Controls how
  # granular the typing animation looks; the total time is unaffected.
  @chars_per_step 20

  @bot_lang "python"

  @spec init(%{game: Game.t(), bot_id: integer()}) ::
          {:ok, Params.t()} | {:error, :no_solution}
  def init(%{game: game, bot_id: bot_id}) do
    bot = Game.Helpers.get_player(game, bot_id)
    task = Game.Helpers.get_task(game)

    case get_solution(task) do
      nil ->
        {:error, :no_solution}

      solution ->
        bot_time_ms = get_bot_time_ms(task)

        {:ok,
         %Params{
           state: :playing,
           lang: bot_lang(bot),
           bot_time_ms: bot_time_ms,
           steps: build_steps(solution, bot_time_ms)
         }}
    end
  end

  @spec next_step(Params.t()) :: Params.t()
  def next_step(%Params{steps: [step | rest], lang: lang} = params) do
    %{
      params
      | steps: rest,
        state: :playing,
        step_command: step.command,
        editor_state: {step.text, lang},
        step_timeout_ms: step.timeout_ms
    }
  end

  def next_step(%Params{steps: []} = params) do
    %{params | state: :finished}
  end

  @spec get_editor_text(String.t()) :: String.t()
  def get_editor_text(text) when is_binary(text), do: text
  def get_editor_text(_), do: ""

  # The bot always solves in python, using the reference solution stored on the task.
  defp bot_lang(_bot), do: @bot_lang

  defp get_solution(%{solutions: solutions}) when is_map(solutions) do
    Enum.find_value(["python", "py"], fn key ->
      case Map.get(solutions, key) do
        code when is_binary(code) and code != "" -> code
        _ -> nil
      end
    end)
  end

  defp get_solution(_task), do: nil

  # Total time the bot spends before submitting: `time_to_solve_sec - 5s`.
  defp get_bot_time_ms(%{time_to_solve_sec: seconds}) when is_integer(seconds) do
    max(@min_total_time_ms, seconds * 1000 - @submit_buffer_ms)
  end

  defp get_bot_time_ms(_task) do
    max(@min_total_time_ms, @fallback_time_ms - @submit_buffer_ms)
  end

  # Builds the typing animation: a list of `:update_editor` steps that reveal the
  # solution incrementally, followed by a final `:check_result` submission.
  #
  # The number of typing steps is bounded so that each step waits at least
  # `@min_bot_step_timeout`, while the sum of the waits stays close to
  # `total_time_ms` (the last `:check_result` fires immediately after the last
  # keystroke).
  defp build_steps(solution, total_time_ms) do
    length = String.length(solution)
    steps_count = steps_count(length, total_time_ms)
    interval = div(total_time_ms, steps_count)

    typing_steps =
      Enum.map(1..steps_count, fn i ->
        chars = round(length * i / steps_count)

        %{
          command: :update_editor,
          text: String.slice(solution, 0, chars),
          timeout_ms: interval
        }
      end)

    typing_steps ++ [%{command: :check_result, text: solution, timeout_ms: 0}]
  end

  defp steps_count(length, total_time_ms) do
    desired = max(1, div(length, @chars_per_step))

    max_by_time = max_steps_by_time(total_time_ms, desired, min_bot_step_timeout())

    desired
    |> min(max_by_time)
    |> min(max(length, 1))
  end

  defp max_steps_by_time(_total_time_ms, desired, timeout) when timeout <= 0, do: desired
  defp max_steps_by_time(total_time_ms, _desired, timeout), do: max(1, div(total_time_ms, timeout))

  defp min_bot_step_timeout do
    Application.get_env(:codebattle, Bot)[:min_bot_step_timeout]
  end
end
