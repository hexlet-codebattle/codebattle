defmodule CodebattleWeb.Plugs.RequireAuth do
  import Plug.Conn
  import Phoenix.Controller
  import CodebattleWeb.Gettext
  alias CodebattleWeb.Router.Helpers, as: Routes

  def init(options), do: options

  def call(conn, _) do
    next_path = String.replace(conn.request_path, "join", "")

    if conn.assigns.current_user.guest do
      conn
      |> put_flash(:danger, gettext("You must be logged in to access that page"))
      |> redirect(to: Routes.page_path(conn, :index, next: next_path))
      |> halt
    else
      conn
    end
  end
end
