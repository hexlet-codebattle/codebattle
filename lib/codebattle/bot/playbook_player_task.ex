defmodule Codebattle.Bot.PlaybookPlayerTask do
  @moduledoc """
  Process for playing playbooks of tasks
  """

  require Logger

  alias Codebattle.Bot.{Builder, Playbook, SocketDriver}
  alias Codebattle.GameProcess.Play

  @timeout Application.get_env(:codebattle, Codebattle.Bot)[:timeout]

  def run(params) do
    Logger.info "#{__MODULE__} RUN TASK with PARAMS: #{inspect(params)}, SLEEP for #{@timeout} "

    :timer.sleep(@timeout)
    playbook = Playbook.random(params.task_id)

    if playbook do
      {id, diff} = playbook
      Logger.info "#{__MODULE__} BOT START with playbook_id = #{id}"

      {:ok, socket_pid} = SocketDriver.start_link(
        CodebattleWeb.Endpoint,
        CodebattleWeb.UserSocket
      )

      bot = Builder.build
      Play.join_game(params.game_id, bot)
      game_topic = "game:" <> to_string(params.game_id)
      SocketDriver.join(socket_pid, game_topic)
      diffs = Map.get(diff, "playbook")
      start_bot_cycle(diffs, game_topic, socket_pid)
    end
  end

  defp start_bot_cycle(diffs, game_topic, socket_pid) do
    # Diff is one the maps
    #
    # 1 Main map with action to update text
    # %{"time" => 10, "delta" => []}
    #
    # 2 Map with action to update lang
    # %{"time" => 10, "lang" => "elixir"}

    init_document = TextDelta.new() |> TextDelta.insert("")
    init_lang = :js

    {editor_text, lang} = Enum.reduce diffs, {init_document, init_lang}, fn(diff_map, {document, lang}) ->
      diff_map |> Map.get("time") |> :timer.sleep
      #TODO: maybe optimize serialization/deserialization process
      delta = diff_map |> Map.get("delta", nil)
      if delta do
        text_delta = delta |> AtomicMap.convert(safe: true) |> TextDelta.new
        new_document = TextDelta.apply!(document, text_delta)
        SocketDriver.push(socket_pid, game_topic, "editor:text", %{"editor_text" => new_document.ops |> hd |> Map.get(:insert)})
        {new_document, lang}
      else
        lang = diff_map |> Map.get("lang")
        SocketDriver.push(socket_pid, game_topic, "editor:lang", %{"lang" => lang})
        {document, lang}
      end
    end
    SocketDriver.push(socket_pid, game_topic, "check_result", %{"editor_text" => editor_text.ops |> hd |> Map.get(:insert), "lang" => lang})
  end
end
