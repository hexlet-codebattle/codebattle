defmodule Codebattle.Bot.PlaybookPlayer do
  @moduledoc """
  Process for playing playbooks of tasks
  """

  require Logger
  alias Codebattle.Bot.Playbook

  def call(params) do
    playbook = Playbook.random(params.task_id)

    if playbook do
      %Playbook{id: id, winner_id: winner_id, data: playbook_data} = playbook
      [init_state | actions] = create_user_playbook(playbook_data.records, winner_id)
      player_meta = Enum.find(playbook_data.players, &(&1["id"] == winner_id))
      step_coefficient = params.bot_time_ms / Map.get(player_meta, "total_time_ms")

      Logger.info("#{__MODULE__} BOT START with playbook_id: #{id};
        bot_time_ms: #{params.bot_time_ms},
        k: #{step_coefficient},
        total_time_ms: #{player_meta["total_time_ms"]}
        ")

      start_playbook_seq(init_state, actions, params.game_channel, step_coefficient)
    else
      :no_playbook
    end
  end

  defp start_playbook_seq(
         %{"editor_text" => editor_text, "editor_lang" => init_lang},
         actions,
         channel_pid,
         step_coefficient
       ) do
    # Action is one the maps
    #
    # 1 Main map with action to update text or lang
    # %{"type" => "editor_text", "diff" => %{time" => 10, "delta" => [], next_lang: "js"}}
    #
    # 2 Map with action to send solution
    # %{"type" => "game_over"}

    init_document = TextDelta.new() |> TextDelta.insert(editor_text)
    state = {init_document, init_lang}
    send_editor_state(channel_pid, state)

    %{
      editor_state: state,
      actions: actions,
      step_coefficient: step_coefficient
    }

    # perform_action(action, editor_state, channel_pid)
  end

  def update_solution(%{
        playbook_params:
          %{
            editor_state: {document, editor_lang},
            actions: [%{"type" => "update_editor_data", "diff" => diff} = event | rest],
            step_coefficient: step_coefficient
          } = playbook_params,
        game_channel: channel_pid
      }) do
    next_document = create_next_document(document, diff)
    next_lang = diff |> Map.get("next_lang", editor_lang)
    next_editor_state = {next_document, next_lang}
    send_editor_state(channel_pid, next_editor_state)

    new_playbook_params =
      Map.merge(playbook_params, %{
        editor_state: next_editor_state,
        actions: rest
      })

    timeout = get_timer_value(event, step_coefficient)

    {new_playbook_params, Kernel.trunc(timeout)}
  end

  def update_solution(%{
        playbook_params: %{
          editor_state: editor_state,
          actions: [%{"type" => "game_over"} | _rest]
        },
        game_channel: channel_pid
      }) do
    send_check_request(channel_pid, editor_state)

    :stop
  end

  defp create_user_playbook(records, user_id) do
    Enum.filter(
      records,
      &(&1["id"] == user_id &&
          &1["type"] in ["init", "update_editor_data", "game_over"])
    )
  end

  defp create_next_document(document, diff) do
    delta = diff |> Map.get("delta")
    text_delta = delta |> AtomicMap.convert(safe: true) |> TextDelta.new()
    TextDelta.apply!(document, text_delta)
  end

  defp get_timer_value(%{"type" => "game_over"}, _step_coefficient), do: 0

  defp get_timer_value(%{"diff" => diff}, step_coefficient),
    do: Map.get(diff, "time") * step_coefficient

  defp send_editor_state(_channel_pid, {%{ops: []}, _lang}) do
    :ok
  end

  defp send_editor_state(channel_pid, {document, lang}) do
    PhoenixClient.Channel.push_async(channel_pid, "editor:data", %{
      "lang_slug" => lang,
      "editor_text" => document.ops |> hd |> Map.get(:insert)
    })
  end

  defp send_check_request(channel_pid, {document, lang}) do
    PhoenixClient.Channel.push_async(channel_pid, "check_result", %{
      "lang_slug" => lang,
      "editor_text" => document.ops |> hd |> Map.get(:insert)
    })
  end
end
