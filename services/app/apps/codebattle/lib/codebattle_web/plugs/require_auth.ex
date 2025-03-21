defmodule CodebattleWeb.Plugs.RequireAuth do
  @moduledoc false
  use Gettext, backend: CodebattleWeb.Gettext

  import Phoenix.Controller
  import Plug.Conn

  alias CodebattleWeb.Router.Helpers, as: Routes

  def init(options), do: options

  def call(conn, _) do
    if conn.assigns.current_user.is_guest do
      next_path = String.replace(conn.request_path, "join", "")
      url = Routes.session_path(conn, :new, next: next_path)

      conn
      |> put_flash(:danger, gettext("You must be logged in to access that page"))
      |> redirect(to: url)
      |> halt()
    else
      conn
    end
  end
end
