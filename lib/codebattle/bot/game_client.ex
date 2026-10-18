defmodule Codebattle.Bot.GameClient do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  def send(game_channel, :update_editor, {editor_text, lang_slug}) do
    PhoenixClient.Channel.push_async(game_channel, "editor:data", %{
      "lang_slug" => lang_slug,
      "editor_text" => editor_text
    })

    # The bot types at the end of its text; the caret goes there (offsets are Monaco's UTF-16 units).
    PhoenixClient.Channel.push_async(game_channel, "editor:cursor_position", %{
      "offset" => div(byte_size(:unicode.characters_to_binary(editor_text, :utf8, :utf16)), 2)
    })
  end

  def send(game_channel, :check_result, {editor_text, lang_slug}) do
    PhoenixClient.Channel.push_async(game_channel, "check_result", %{
      "lang_slug" => lang_slug,
      "editor_text" => editor_text
    })
  end
end
