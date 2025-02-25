defmodule CodebattleWeb.Plugs.MaintenanceMode do
  @moduledoc false
  use Gettext, backend: CodebattleWeb.Gettext

  import Phoenix.Controller
  import Plug.Conn

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    if FunWithFlags.enabled?(:maintenance_mode) do
      conn
      |> put_status(:service_unavailable)
      |> put_layout({CodebattleWeb.LayoutView, "landing.html"})
      |> put_view(CodebattleWeb.RootView)
      |> render("maintenance.html")
      |> halt()
    else
      conn
    end
  end
end
