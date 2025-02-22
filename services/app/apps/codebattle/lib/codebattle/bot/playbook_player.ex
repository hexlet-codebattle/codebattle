defmodule Codebattle.Bot.PlaybookPlayer do
  @moduledoc """
  Module for playing playbooks
  """

  alias Codebattle.Bot
  alias Codebattle.Bot.PlaybookPlayer.Params
  alias Codebattle.Game
  alias Codebattle.Playbook
  alias Delta.Op

  require Logger

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
      state
      bot_time_ms
      step_command
      step_timeout_ms
      editor_state
      playbook_id
      step_coefficient
      total_playbook_time_ms
    )a
  end

  @min_bot_step_timeout Application.compile_env(:codebattle, Bot)[
                          :min_bot_step_timeout
                        ]

  @pro_rating 1777
  @junior_rating 1212

  @pro_time_ms %{
    "elementary" => to_timeout(minute: 2),
    "easy" => to_timeout(minute: 3),
    "medium" => to_timeout(minute: 5),
    "hard" => to_timeout(minute: 7)
  }

  @junior_time_ms %{
    "elementary" => to_timeout(minute: 7),
    "easy" => to_timeout(minute: 11),
    "medium" => to_timeout(minute: 13),
    "hard" => to_timeout(minute: 17)
  }

  def init(%{game: game, bot_id: bot_id}) do
    bot = Game.Helpers.get_player(game, bot_id)

    case bot.playbook_id && Playbook.get(bot.playbook_id) do
      nil ->
        {:error, :no_playbook}

      %Playbook{id: id, winner_id: winner_id, data: playbook_data} ->
        playbook_actions = prepare_user_playbook(playbook_data.records, winner_id)
        playbook_winner_meta = Enum.find(playbook_data.players, &(&1.id == winner_id))
        bot_time_ms = get_bot_time_ms(game)

        step_coefficient = round(bot_time_ms / (playbook_winner_meta.total_time_ms + 1))

        {:ok,
         %Params{
           state: :playing,
           playbook_id: id,
           actions: playbook_actions,
           step_coefficient: step_coefficient,
           total_playbook_time_ms: playbook_winner_meta.total_time_ms,
           bot_time_ms: bot_time_ms
         }}
    end
  end

  # init
  def next_step(%Params{editor_state: nil} = params) do
    %{actions: [%{editor_text: editor_text, editor_lang: editor_lang} | rest_actions]} = params

    %{
      params
      | actions: rest_actions,
        step_command: :update_editor,
        editor_state: {[Op.insert(editor_text)], editor_lang},
        step_timeout_ms: to_timeout(second: 1)
    }
  end

  def next_step(%Params{actions: [%{type: "update_editor_data", diff: diff} = action | rest_actions]} = params) do
    {operations, lang} = params.editor_state

    operations = Delta.compose(operations, stringify_keys(diff.delta))
    lang = Map.get(diff, :next_lang, lang)

    %{
      params
      | actions: rest_actions,
        step_command: :update_editor,
        editor_state: {operations, lang},
        step_timeout_ms: get_bot_step_timeout(action, params.step_coefficient)
    }
  end

  def next_step(%Params{actions: [%{type: "game_over"} = action | _rest]} = params) do
    {operations, lang} = params.editor_state

    %{
      params
      | actions: [],
        step_command: :check_result,
        editor_state: {operations, lang},
        step_timeout_ms: get_bot_step_timeout(action, params.step_coefficient)
    }
  end

  def next_step(%Params{actions: []} = params) do
    %{params | state: :finished}
  end

  def get_editor_text([]), do: ""
  def get_editor_text(%{insert: text}), do: text
  def get_editor_text(%{"insert" => text}), do: text
  def get_editor_text([%{insert: text}]), do: text
  def get_editor_text([%{"insert" => text}]), do: text

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
    |> round()
  end

  # Calculates the total operating time of the bot
  # based on the hyperbolic dependence of time on the rating
  # y = k/(x + b);
  # y: time, x: rating;
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

    round(k / (player_rating + b))
  end

  def stringify_keys(list) when is_list(list) do
    Enum.map(list, &stringify_keys/1)
  end

  def stringify_keys(map) do
    Map.new(map, fn {k, v} -> {to_string(k), v} end)
  end
end
