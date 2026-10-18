defmodule Codebattle.Bot.PlaybookPlayer do
  @moduledoc """
  Simulates a bot solving a task.

  Instead of replaying recorded games (playbooks), the bot takes the task's
  stored reference solution from the database (`task.solutions["python"]`, falling
  back to the python `task.solution` from the tasks repo) and
  "types" it into the editor like a human, submitting the final solution after
  `time_to_solve_sec - 5s`.
  """

  alias Codebattle.Bot.PlaybookPlayer.Params
  alias Codebattle.Game

  defmodule Params do
    @moduledoc false
    # `steps` is the precomputed list of actions the bot performs, each shaped as:
    #
    #   %{command: :update_editor, text: "partial editor text", timeout_ms: 1500}
    #   %{command: :check_result,  text: "full solution",       timeout_ms: 0}
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

  @type edit_op :: %{
          required(:type) => :insert | :delete,
          optional(:text) => String.t(),
          optional(:phase) => :solution | :typo_insert | :typo_delete,
          optional(:line) => non_neg_integer()
        }

  # The bot submits a bit earlier than the full allotted time, so it looks like
  # a human who finished with a few seconds to spare.
  @submit_buffer_ms to_timeout(second: 5)

  # Fallback when a task has no `time_to_solve_sec` (should not happen: the column
  # is NOT NULL with a default, but we stay defensive).
  @fallback_time_ms to_timeout(minute: 3)

  # Lower bound for the total typing time, so tiny `time_to_solve_sec` values
  # don't make the bot submit instantly.
  @min_total_time_ms to_timeout(second: 5)
  @max_activity_delay_ms 1_999
  # Typing pace: an average character weighs ~9, i.e. ~180ms per keystroke.
  @keystroke_ms_per_weight 20

  @bot_lang "python"
  @wrong_lines [
    "print('debug')\n",
    "# temporary check\n",
    "tmp = None\n"
  ]

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

  # Tasks pushed from the hexlet-codebattle/tasks repo carry only the single `solution`
  # field, which that repo always writes in python; `solutions` stays empty for them.
  defp get_solution(task) do
    solutions = Map.get(task, :solutions) || %{}

    Enum.find_value(["python", "py"], &present(Map.get(solutions, &1))) ||
      present(Map.get(task, :solution))
  end

  defp present(code) when is_binary(code) do
    if String.trim(code) == "", do: nil, else: code
  end

  defp present(_code), do: nil

  # Total time the bot spends before submitting: `time_to_solve_sec - 5s`.
  defp get_bot_time_ms(%{time_to_solve_sec: seconds}) when is_integer(seconds) do
    max(@min_total_time_ms, seconds * 1000 - @submit_buffer_ms)
  end

  defp get_bot_time_ms(_task) do
    max(@min_total_time_ms, @fallback_time_ms - @submit_buffer_ms)
  end

  # Builds the typing animation from low-level edit operations:
  #   * reference solution text becomes one `:insert` op per grapheme;
  #   * short wrong lines become `:insert` ops followed by matching `:delete` ops;
  #   * operation timings are weighted with deterministic white noise;
  #   * the final `:check_result` submits the clean reference solution immediately.
  defp build_steps(solution, total_time_ms) do
    operations = build_operations(solution)
    states = build_editor_states(operations)
    timeouts = distribute_timeouts(total_time_ms, operations, solution)

    typing_steps =
      states
      |> Enum.zip(timeouts)
      |> expand_activity_steps()
      |> Enum.map(fn {text, timeout_ms} ->
        %{
          command: :update_editor,
          text: text,
          timeout_ms: timeout_ms
        }
      end)

    typing_steps ++ [%{command: :check_result, text: solution, timeout_ms: 0}]
  end

  defp expand_activity_steps(timed_states) do
    Enum.flat_map(timed_states, fn {text, timeout_ms} ->
      timeout_ms
      |> split_timeout()
      |> Enum.with_index()
      |> Enum.map(&activity_step(text, &1))
    end)
  end

  defp activity_step(text, {timeout_ms, index}) when rem(index, 2) == 0, do: {text, timeout_ms}
  defp activity_step(text, {timeout_ms, _index}), do: {text <> filler_char(text), timeout_ms}

  defp split_timeout(timeout_ms) when timeout_ms <= @max_activity_delay_ms, do: [timeout_ms]

  defp split_timeout(timeout_ms) do
    parts_count =
      timeout_ms
      |> div_ceil(@max_activity_delay_ms)
      |> odd_count()

    interval = div(timeout_ms, parts_count)
    remainder = rem(timeout_ms, parts_count)

    Enum.map(0..(parts_count - 1), fn index ->
      if index < remainder, do: interval + 1, else: interval
    end)
  end

  defp div_ceil(value, divisor), do: div(value + divisor - 1, divisor)

  defp odd_count(value) when rem(value, 2) == 0, do: value + 1
  defp odd_count(value), do: value

  defp filler_char(text) do
    case rem(:erlang.phash2(text), 3) do
      0 -> "x"
      1 -> "_"
      _ -> "0"
    end
  end

  @spec build_operations(String.t()) :: [edit_op()]
  defp build_operations(solution) do
    chars = String.graphemes(solution)
    correction_positions = solution |> correction_positions() |> MapSet.new()

    {operations, _line} =
      chars
      |> Enum.with_index(1)
      |> Enum.reduce({[], 0}, fn {char, position}, {operations, line} ->
        operation = %{type: :insert, text: char, phase: :solution, line: line}
        operations = [operation | operations]
        next_line = if char == "\n", do: line + 1, else: line

        if MapSet.member?(correction_positions, position) do
          correction_operations = build_correction_operations(solution, position, next_line)
          {Enum.reverse(correction_operations, operations), next_line}
        else
          {operations, next_line}
        end
      end)

    Enum.reverse(operations)
  end

  defp build_correction_operations(solution, position, line) do
    wrong_line = wrong_line(solution, position)

    insert_operations =
      wrong_line
      |> String.graphemes()
      |> Enum.map(&%{type: :insert, text: &1, phase: :typo_insert, line: line})

    delete_operations =
      wrong_line
      |> String.graphemes()
      |> Enum.map(fn _char -> %{type: :delete, phase: :typo_delete, line: line} end)

    insert_operations ++ delete_operations
  end

  defp build_editor_states(operations) do
    Enum.scan(operations, "", &apply_operation/2)
  end

  defp apply_operation(%{type: :insert, text: text}, current_text), do: current_text <> text

  defp apply_operation(%{type: :delete}, current_text) do
    current_text
    |> String.graphemes()
    |> Enum.drop(-1)
    |> Enum.join()
  end

  defp correction_positions(solution) do
    length = String.length(solution)
    max_corrections = correction_count(length)

    if max_corrections == 0 do
      []
    else
      chars = String.graphemes(solution)

      newline_positions =
        chars
        |> Enum.with_index(1)
        |> Enum.filter(fn {char, position} -> char == "\n" and position < length end)
        |> Enum.map(&elem(&1, 1))

      targets =
        case max_corrections do
          1 -> [div(length, 2)]
          _ -> [div(length, 3), div(length * 2, 3)]
        end

      targets
      |> Enum.map(&nearest_position(newline_positions, &1, length))
      |> Enum.uniq()
      |> Enum.take(max_corrections)
    end
  end

  defp correction_count(length) when length < 40, do: 0
  defp correction_count(length) when length < 120, do: 1
  defp correction_count(_length), do: 2

  defp nearest_position([], target, length), do: max(1, min(target, length - 1))

  defp nearest_position(positions, target, _length) do
    Enum.min_by(positions, &abs(&1 - target))
  end

  defp wrong_line(solution, position) do
    index = :erlang.phash2({solution, position}, length(@wrong_lines))
    line = Enum.at(@wrong_lines, index)

    if position == 0 or String.at(solution, position - 1) == "\n" do
      line
    else
      "\n" <> line
    end
  end

  # Keystrokes go at a typing pace and the rest of the time becomes thinking pauses after
  # lines and words. Spreading every keystroke evenly over the whole time typed a short
  # solution at one character per few seconds, so the bot looked idle.
  defp distribute_timeouts(_total_time_ms, [], _solution), do: []

  defp distribute_timeouts(total_time_ms, operations, solution) do
    indexed_operations = Enum.with_index(operations)

    typing_weights =
      Enum.map(indexed_operations, fn {operation, index} -> operation_weight(operation, index, solution) end)

    {pause_weights, _previous} =
      Enum.map_reduce(indexed_operations, nil, fn {operation, index}, previous ->
        {pause_weight(operation, previous, index, solution), operation}
      end)

    typing_ms = Enum.sum(typing_weights) * @keystroke_ms_per_weight
    total_pause_weight = Enum.sum(pause_weights)

    if typing_ms >= total_time_ms or total_pause_weight == 0 do
      spread(total_time_ms, typing_weights)
    else
      keystrokes_ms = Enum.map(typing_weights, &(&1 * @keystroke_ms_per_weight))
      pauses_ms = spread(total_time_ms - typing_ms, pause_weights)
      Enum.zip_with(keystrokes_ms, pauses_ms, &+/2)
    end
  end

  defp spread(total_ms, weights) do
    total_weight = Enum.sum(weights)

    {timeouts, allocated_ms} =
      Enum.map_reduce(weights, 0, fn weight, allocated_ms ->
        timeout_ms = div(total_ms * weight, total_weight)
        {timeout_ms, allocated_ms + timeout_ms}
      end)

    add_remainder(timeouts, total_ms - allocated_ms)
  end

  # A pause after finishing a line (not after blank lines) and a short one between words.
  defp pause_weight(%{type: :insert, phase: :solution, text: "\n"}, %{text: "\n"}, _index, _solution), do: 0

  defp pause_weight(%{type: :insert, phase: :solution, text: "\n"}, _previous, index, solution) do
    16
    |> add_noise({:pause, index}, solution, 6)
    |> max(1)
  end

  defp pause_weight(%{type: :insert, phase: :solution, text: " "}, %{text: previous_text}, index, solution)
       when previous_text not in [" ", "\t", "\n"] do
    2
    |> add_noise({:pause, index}, solution, 1)
    |> max(1)
  end

  defp pause_weight(_operation, _previous, _index, _solution), do: 0

  defp operation_weight(%{type: :delete} = operation, index, solution) do
    13
    |> add_line_tempo(operation)
    |> add_noise(index, solution, 5)
    |> max(1)
  end

  defp operation_weight(%{type: :insert, phase: :typo_insert} = operation, index, solution) do
    7
    |> add_line_tempo(operation)
    |> add_noise(index, solution, 4)
    |> max(1)
  end

  defp operation_weight(%{type: :insert, text: "\n"} = operation, index, solution) do
    20
    |> add_line_tempo(operation)
    |> add_noise(index, solution, 6)
    |> max(1)
  end

  defp operation_weight(%{type: :insert, text: text} = operation, index, solution) do
    text
    |> char_weight()
    |> add_line_tempo(operation)
    |> add_noise(index, solution, 4)
    |> max(1)
  end

  defp char_weight(text) when text in [" ", "\t"], do: 6
  defp char_weight(text) when text in ["(", ")", "[", "]", "{", "}", ",", ".", ":", "_"], do: 11
  defp char_weight(_text), do: 9

  defp add_line_tempo(weight, %{line: line}) do
    line_tempo = rem(line * 7 + 3, 9) - 4
    weight + line_tempo
  end

  defp add_line_tempo(weight, _operation), do: weight

  defp add_noise(weight, index, solution, amplitude) do
    noise = rem(:erlang.phash2({solution, index}, amplitude * 2 + 1), amplitude * 2 + 1) - amplitude
    weight + noise
  end

  defp add_remainder(timeouts, 0), do: timeouts

  defp add_remainder(timeouts, remainder) do
    timeouts
    |> Enum.with_index()
    |> Enum.map(fn {timeout_ms, index} ->
      if index < remainder, do: timeout_ms + 1, else: timeout_ms
    end)
  end
end
