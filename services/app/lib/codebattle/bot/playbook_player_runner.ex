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
      {id, playbook_data} = playbook
      diffs = Map.get(playbook_data, "playbook")
      meta = Map.get(playbook_data, "meta")
      game_topic = "game:#{params.game_id}"

      step_coefficient = params.bot_time_ms / Map.get(meta, "total_time_ms")

      Logger.info("#{__MODULE__} BOT START with playbook_id: #{id};
        bot_time_ms: #{params.bot_time_ms},
        k: #{step_coefficient},
        total_time_ms: #{meta["total_time_ms"]}
        ")

      start_bot_cycle(meta, diffs, game_topic, params.game_channel, step_coefficient)
    end
  end

  defp start_bot_cycle(meta, diffs, game_topic, channel_pid, step_coefficient) do
    # Diff is one the maps
    #
    # 1 Main map with action to update text
    # %{"time" => 10, "delta" => []}
    #
    # 2 Map with action to update lang
    # %{"time" => 10, "lang" => "elixir"}

    init_document = TextDelta.new() |> TextDelta.insert("")
    init_lang = meta["init_lang"]

    {editor_text, lang} =
      Enum.reduce(diffs, {init_document, init_lang}, fn diff_map, {document, lang} ->
        timer_value = Map.get(diff_map, "time") * step_coefficient
        :timer.sleep(Kernel.trunc(timer_value))
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
