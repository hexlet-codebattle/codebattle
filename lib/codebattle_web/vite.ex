defmodule CodebattleWeb.Vite do
  @moduledoc """
  Static files from static, served under /assets (digested in prod).
  The frontend bundle itself is resolved by `CodebattleWeb.Frontend`.
  """

  def dev?, do: Application.get_env(:codebattle, :env) == :dev

  @doc "The URL of a static file, e.g. `static_asset_path(\"images/logo.svg\")`."
  def static_asset_path(path) do
    if dev?(), do: "/assets/" <> path, else: CodebattleWeb.Endpoint.static_path("/assets/" <> path)
  end
end
