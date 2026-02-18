defmodule CodebattleWeb.Plugs.AdminOnly do
  @moduledoc false
  use Gettext, backend: CodebattleWeb.Gettext

  import Phoenix.Controller
  import Plug.Conn

  alias Codebattle.User

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
