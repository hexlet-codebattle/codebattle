defmodule CodebattleWeb.Plugs.Session do
  @moduledoc false

  def init(opts), do: opts

  def call(conn, _opts) do
    CodebattleWeb.Endpoint.session_options()
    |> Plug.Session.init()
    |> then(&Plug.Session.call(conn, &1))
  end
end
