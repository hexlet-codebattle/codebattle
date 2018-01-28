defmodule CodebattleWeb.Plugs.RequireAuth do
  import Plug.Conn
  import Phoenix.Controller
  import CodebattleWeb.Gettext
  alias CodebattleWeb.Router.Helpers, as: RouteHelpers

  def init(options), do: options

  def call(conn, _) do
    if conn.assigns.current_user.guest do
      conn
      |> put_flash(:error, gettext("You must be logged in to access that page"))
      |> redirect(to: RouteHelpers.page_path(conn, :index))
      |> halt
    else
      conn
    end
  end
end
