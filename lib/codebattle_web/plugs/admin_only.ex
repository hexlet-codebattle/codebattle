defmodule CodebattleWeb.Plugs.AdminOnly do
  @moduledoc false
  use Gettext, backend: CodebattleWeb.Gettext

  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User
  alias Codebattle.UserSession
  alias Phoenix.LiveView

  @spec init(Keyword.t()) :: Keyword.t()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), Keyword.t()) :: Plug.Conn.t()
  def call(conn, _opts) do
    if conn.assigns.current_user && User.admin?(conn.assigns.current_user) do
      conn
    else
      conn
      |> put_flash(:danger, gettext("You must be admin to access that page"))
      |> redirect(to: "/")
      |> halt()
    end
  end

  def on_mount(:default, _params, session, socket) do
    socket =
      Phoenix.Component.assign_new(socket, :current_user, fn ->
        case UserSession.get_active_by_token(session["user_session_token"]) do
          %UserSession{user: user} -> user
          nil -> nil
        end
      end)

    if User.admin?(socket.assigns.current_user) do
      {:cont, socket}
    else
      {:halt, LiveView.redirect(socket, to: "/")}
    end
  end
end
