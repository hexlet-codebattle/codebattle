defmodule CodebattleWeb.Plugs.AdminOnly do
  alias Codebattle.User

  import CodebattleWeb.Gettext
  import Phoenix.Controller
  import Plug.Conn

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
end
