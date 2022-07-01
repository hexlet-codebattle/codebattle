defmodule Codebattle.Bot.PlaybookPlayer do
  @moduledoc """
  Module for playing playbooks
  """

  require Logger

  alias Codebattle.Bot
  alias Codebattle.Game

  defmodule Params do
    @moduledoc false
    # Action is one the maps
    #
    # 1 Main map with action to update text or lang
    # %{type: "editor_text", diff: %{time: 10, delta: [], next_lang: "js"}}
    #
    # 2 Map with action to send check_solution
    # %{type: "game_over"}

    defstruct ~w(
      actions
      bot_time_ms
      step_command
      step_timeout_ms
      editor_state
      playbook_id
      step_coefficient
      total_playbook_time_ms
    )a
  end

  alias Bot.PlaybookPlayer.Params

  @min_bot_step_timeout Application.compile_env(:codebattle, Codebattle.Bot)[
                          :min_bot_step_timeout
                        ]

  @pro_rating 1777
  @junior_rating 1111

  @pro_time_ms %{
    "elementary" => :timer.minutes(3),
    "easy" => :timer.minutes(5),
    "medium" => :timer.minutes(7),
    "hard" => :timer.minutes(11)
  }

  @junior_time_ms %{
    "elementary" => :timer.minutes(13),
    "easy" => :timer.minutes(17),
    "medium" => :timer.minutes(19),
    "hard" => :timer.minutes(23)
  }

  def init(game) do
    case Bot.Playbook.get_random(game.task_id) do
      %Bot.Playbook{id: id, winner_id: winner_id, data: playbook_data} ->
        playbook_actions = prepare_user_playbook(playbook_data.records, winner_id)
        playbook_winner_meta = Enum.find(playbook_data.players, &(&1.id == winner_id))
        bot_time_ms = Float.round(get_bot_time_ms(game), 3)

        step_coefficient = Float.round(bot_time_ms / (playbook_winner_meta.total_time_ms + 1), 3)

        {:ok,
         %Params{
           playbook_id: id,
           actions: playbook_actions,
           step_coefficient: step_coefficient,
           total_playbook_time_ms: playbook_winner_meta.total_time_ms,
           bot_time_ms: bot_time_ms
         }}

      _ ->
        {:error, :no_playbook}
    end
  end

  # init
  def next_step(params = %Params{editor_state: nil}) do
    %{actions: [%{editor_text: editor_text, editor_lang: editor_lang} | rest_actions]} = params

    document = TextDelta.new() |> TextDelta.insert(editor_text)

    %{
      params
      | actions: rest_actions,
        step_command: :update_editor,
        editor_state: {document, editor_lang},
        step_timeout_ms: :timer.seconds(1)
    }
  end

  def next_step(
        params = %Params{
          actions: [action = %{type: "update_editor_data", diff: diff} | rest_actions]
        }
      ) do
    {document, lang} = params.editor_state
    document = TextDelta.apply!(document, TextDelta.new(diff.delta))
    lang = Map.get(diff, :next_lang, lang)

    %{
      params
      | actions: rest_actions,
        step_command: :update_editor,
        editor_state: {document, lang},
        step_timeout_ms: get_bot_step_timeout(action, params.step_coefficient)
    }
  end

  def next_step(params = %Params{actions: [action = %{type: "game_over"} | _rest]}) do
    {document, lang} = params.editor_state

    %{
      params
      | actions: [],
        step_command: :check_result,
        editor_state: {document, lang},
        step_timeout_ms: get_bot_step_timeout(action, params.step_coefficient)
    }
  end

  def get_editor_text(%{ops: []}), do: nil
  def get_editor_text(document), do: document.ops |> hd |> Map.get(:insert)

  defp prepare_user_playbook(records, user_id) do
    Enum.filter(
      records,
      &(&1.id == user_id && &1.type in ["init", "update_editor_data", "game_over"])
    )
  end

  defp get_bot_step_timeout(%{type: "game_over"}, _step_coefficient), do: 0

  defp get_bot_step_timeout(%{diff: diff}, step_coefficient) do
    @min_bot_step_timeout
    |> max(diff.time * step_coefficient)
    |> Kernel.*(1.0)
    |> Float.round(3)
  end

  @doc """
  Calculates the total operating time of the bot
  based on the hyperbolic dependence of time on the rating
  y = k/(x + b);
  y: time, x: rating;
  """
  defp get_bot_time_ms(game) do
    player_rating =
      case Game.Helpers.get_first_non_bot(game) do
        nil -> 1200
        player -> player.rating
      end

    x1 = @pro_rating
    x2 = @junior_rating

    y1 = @pro_time_ms[game.level]
    y2 = @junior_time_ms[game.level]

    k = y1 * (x1 * y2 - x2 * y2) / (y2 - y1)
    b = (x1 * y1 - x2 * y2) / (y2 - y1)

    k / (player_rating + b)
  end
end
