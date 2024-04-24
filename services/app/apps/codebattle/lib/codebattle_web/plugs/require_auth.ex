defmodule CodebattleWeb.Plugs.RequireAuth do
  alias CodebattleWeb.Router.Helpers, as: Routes

  import CodebattleWeb.Gettext
  import Phoenix.Controller
  import Plug.Conn

  def init(options), do: options

  def call(conn, _) do
    if conn.assigns.current_user.is_guest do
      :codebattle
      |> Application.get_env(:guest_user_force_redirect_url)
      |> case do
        nil ->
          next_path = String.replace(conn.request_path, "join", "")
          url = Routes.session_path(conn, :new, next: next_path)

          conn
          |> put_flash(:danger, gettext("You must be logged in to access that page"))
          |> redirect(to: url)
          |> halt()

        url ->
          conn
          |> redirect(external: url)
          |> halt()
      end
    else
      conn
    end
  end
end
