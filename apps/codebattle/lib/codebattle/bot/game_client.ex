defmodule Codebattle.Bot.GameClient do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  require Logger

  def send(game_channel, :update_editor, {editor_text, lang_slug}) do
    PhoenixClient.Channel.push_async(game_channel, "editor:data", %{
      "lang_slug" => lang_slug,
      "editor_text" => editor_text
    })
  end

  def send(game_channel, :check_result, {editor_text, lang_slug}) do
    PhoenixClient.Channel.push_async(game_channel, "check_result", %{
      "lang_slug" => lang_slug,
      "editor_text" => editor_text
    })
  end
end
