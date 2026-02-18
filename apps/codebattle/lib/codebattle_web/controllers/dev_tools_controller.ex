defmodule CodebattleWeb.DevToolsController do
  use CodebattleWeb, :controller

  @doc """
  Returns Chrome DevTools IDE integration configuration.
  Enables "Open in Editor" functionality from Chrome DevTools.

  Supported editors: vscode, cursor, zed, webstorm, idea
  Change the editor below to match your preference.
  """
  def index(conn, _params) do
    # Configure preferred editor with DEVTOOLS_EDITOR: vscode, cursor, zed, webstorm, idea
    editor = System.get_env("DEVTOOLS_EDITOR", "cursor")

    config = %{
      "workspace" => %{
        "root" => File.cwd!(),
        "uuid" => "codebattle-dev-workspace"
      },
      "editor" => editor_config(editor)
    }

    json(conn, config)
  end

  defp editor_config("vscode") do
    %{"name" => "vscode", "scheme" => "vscode://file%s:%l:%c"}
  end

  defp editor_config("cursor") do
    %{"name" => "cursor", "scheme" => "cursor://file%s:%l:%c"}
  end

  defp editor_config("zed") do
    %{"name" => "zed", "scheme" => "zed://open?path=%s&line=%l&column=%c"}
  end

  defp editor_config("webstorm") do
    %{"name" => "webstorm", "scheme" => "webstorm://open?file=%s&line=%l&column=%c"}
  end

  defp editor_config("idea") do
    %{"name" => "idea", "scheme" => "idea://open?file=%s&line=%l&column=%c"}
  end

  defp editor_config(_), do: editor_config("vscode")
end
