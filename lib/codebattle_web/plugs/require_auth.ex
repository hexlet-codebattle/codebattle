defmodule CodebattleWeb.Plugs.RequireAuth do
  @moduledoc false
  use Gettext, backend: CodebattleWeb.Gettext

  import Phoenix.Controller
  import Plug.Conn

  alias CodebattleWeb.Router.Helpers, as: Routes

  def init(options), do: options

  def call(conn, _) do
    if conn.assigns.current_user.is_guest do
      next_path =
        conn.request_path
        |> String.replace("join", "")
        |> append_query_string(conn.query_string)

      url = Routes.session_path(conn, :new, next: next_path)

      conn
      |> put_flash(:danger, gettext("You must be logged in to access that page"))
      |> redirect(to: url)
      |> halt()
    else
      conn
    end
  end

  defp append_query_string(path, ""), do: path
  defp append_query_string(path, query_string), do: "#{path}?#{query_string}"
end
