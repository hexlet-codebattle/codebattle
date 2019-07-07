defmodule Codebattle.Bot.PlaybookPlayerRunner do
  @moduledoc """
  Process for playing playbooks of tasks
  """

  require Logger

  alias Codebattle.Bot.{Playbook}

  @timeout Application.get_env(:codebattle, Codebattle.Bot.PlaybookPlayerRunner)[:timeout]

  def call(params) do

    :timer.sleep(@timeout)
    playbook = Playbook.random(params.task_id)
    if playbook do
      {id, diff} = playbook
      Logger.info("#{__MODULE__} BOT START with playbook_id = #{id}")
      diffs = Map.get(diff, "playbook")
      meta = Map.get(diff, "meta")
      game_topic = "game:#{params.game_id}"
      if meta do
        step_coefficient = params.apponent_data /  Map.get(meta, "total_time")
        start_bot_cycle(diffs, game_topic, params.game_channel, step_coefficient)
      else
        start_bot_cycle(diffs, game_topic, params.game_channel, 0)
      end
    end
  end

  defp start_bot_cycle(diffs, game_topic, channel_pid, step_coefficient) do
    # Diff is one the maps
    #
    # 1 Main map with action to update text
    # %{"time" => 10, "delta" => []}
    #
    # 2 Map with action to update lang
    # %{"time" => 10, "lang" => "elixir"}

    init_document = TextDelta.new() |> TextDelta.insert("")
    init_lang = "js"
    {editor_text, lang} =
      Enum.reduce(diffs, {init_document, init_lang}, fn diff_map, {document, lang} ->
        timer_value = Map.get(diff_map, "time") * step_coefficient
        :timer.sleep(timer_value)
        # TODO: maybe optimize serialization/deserialization process
        delta = diff_map |> Map.get("delta", nil)

        if delta do
          text_delta = delta |> AtomicMap.convert(safe: true) |> TextDelta.new()
          new_document = TextDelta.apply!(document, text_delta)

          PhoenixClient.Channel.push_async(channel_pid, "editor:data", %{
            "lang" => lang,
            "editor_text" => new_document.ops |> hd |> Map.get(:insert)
          })

          {new_document, lang}
        else
          lang = diff_map |> Map.get("lang")

          PhoenixClient.Channel.push_async(channel_pid, "editor:data", %{
            "lang" => lang,
            "editor_text" => document.ops |> hd |> Map.get(:insert)
          })

          {document, lang}
        end
      end)

    PhoenixClient.Channel.push_async(channel_pid, "check_result", %{
      "lang" => lang,
      "editor_text" => editor_text.ops |> hd |> Map.get(:insert)
    })
  end

end
