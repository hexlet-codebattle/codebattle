defmodule Codebattle.Bot.PlaybookPlayerRunner do
  @moduledoc """
  Process for playing playbooks of tasks
  """

  require Logger

  alias Codebattle.Bot.{Playbook, ChatClientRunner}

  @timeout Application.get_env(:codebattle, Codebattle.Bot.PlaybookPlayerRunner)[:timeout]

  def call(params) do
    :timer.sleep(@timeout)
    playbook = Playbook.random(params.task_id)

    if playbook do
      %{id: id, winner_id: winner_id, data: playbook_data} = playbook

      [init_state | actions] =
        Map.get(playbook_data, "playbook") |> create_user_playbook(winner_id)

      player_meta = Map.get(playbook_data, "players") |> Map.get(to_string(winner_id))
      step_coefficient = params.bot_time_ms / Map.get(player_meta, "total_time_ms")

      Logger.info("#{__MODULE__} BOT START with playbook_id: #{id};
        bot_time_ms: #{params.bot_time_ms},
        k: #{step_coefficient},
        total_time_ms: #{player_meta["total_time_ms"]}
        ")

      start_bot_cycle(init_state, actions, params.game_channel, step_coefficient)
    else
      Task.start(fn -> ChatClientRunner.say_some_excuse(params.chat_channel) end)
    end
  end

  defp start_bot_cycle(
         %{"editor_text" => editor_text, "editor_lang" => init_lang},
         playbook,
         channel_pid,
         step_coefficient
       ) do
    # Action is one the maps
    #
    # 1 Main map with action to update text
    # %{"type" => "editor_text", "diff" => %{time" => 10, "delta" => []}}
    #
    # 2 Map with action to update lang
    # %{"type" => "editor_lang", "diff" => %{"time" => 10, "prev_lang" => "elixir", "next_lang" => "ruby"}}
    #
    # 3 Map with action to send solution
    # %{"type" => "game_complete"}

    init_document = TextDelta.new() |> TextDelta.insert(editor_text)

    Enum.reduce(playbook, {init_document, init_lang}, fn action, editor_state ->
      timer_value = get_timer_value(action, step_coefficient)
      # TODO: maybe optimize serialization/deserialization process
      # delta = diff_map |> Map.get("delta", nil)
      :timer.sleep(Kernel.trunc(timer_value))

      perform_action(action, editor_state, channel_pid)
    end)
  end

  defp perform_action(
         %{"type" => "editor_text", "diff" => diff},
         {document, editor_lang},
         channel_pid
       ) do
    next_document = create_next_document(document, diff)
    next_editor_state = {next_document, editor_lang}
    send_editor_state(channel_pid, next_editor_state)

    next_editor_state
  end

  defp perform_action(
         %{"type" => "editor_lang", "diff" => diff},
         {document, _editor_lang},
         channel_pid
       ) do
    next_lang = diff |> Map.get("next_lang")
    next_editor_state = {document, next_lang}
    send_editor_state(channel_pid, next_editor_state)

    next_editor_state
  end

  defp perform_action(%{"type" => "game_complete"}, editor_state, channel_pid) do
    send_check_request(channel_pid, editor_state)

    editor_state
  end

  defp create_user_playbook(playbook, user_id) do
    Enum.filter(
      playbook,
      &(&1["id"] == user_id &&
          &1["type"] in ["init", "editor_text", "editor_lang", "game_complete"])
    )
  end

  defp create_next_document(document, diff) do
    delta = diff |> Map.get("delta")
    text_delta = delta |> AtomicMap.convert(safe: true) |> TextDelta.new()
    TextDelta.apply!(document, text_delta)
  end

  defp get_timer_value(%{"type" => "game_complete"}, _step_coefficient), do: 0

  defp get_timer_value(%{"diff" => diff}, step_coefficient),
    do: Map.get(diff, "time") * step_coefficient

  defp send_editor_state(channel_pid, {document, lang}) do
    PhoenixClient.Channel.push_async(channel_pid, "editor:data", %{
      "lang" => lang,
      "editor_text" => document.ops |> hd |> Map.get(:insert)
    })
  end

  defp send_check_request(channel_pid, {document, lang}) do
    PhoenixClient.Channel.push_async(channel_pid, "check_result", %{
      "lang" => lang,
      "editor_text" => document.ops |> hd |> Map.get(:insert)
    })
  end
end
