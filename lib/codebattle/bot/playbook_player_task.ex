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

      # diff is map  %{"time" => 10, "diff" => inspect([%Diff.Modified{element: ["t"], index: 0, length: 1, old_element: [" "]}])},

      editor_text = Enum.reduce diffs, " ", fn(diff_map, editor_text) ->
        first_diff = diff_map |> Map.get("diff") |> Code.eval_string |> elem(0)
        new_editor_text = Diff.patch(editor_text, first_diff, &Enum.join/1)
        diff_map |> Map.get("time") |> :timer.sleep
        SocketDriver.push(socket_pid, game_topic, "editor:data", %{"editor_text" => new_editor_text})
        new_editor_text
      end

        SocketDriver.push(socket_pid, game_topic, "check_result", %{"editor_text" => editor_text})
    end
  end
end
