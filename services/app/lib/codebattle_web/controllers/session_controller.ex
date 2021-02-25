defmodule CodebattleWeb.SessionController do
  use CodebattleWeb, :controller

  def new(conn, _params) do
    render(conn, "index.html")
  end

  def remind_password(conn, _params) do
    render(conn, "index.html")
  end

  def delete(conn, _params) do
    conn
    |> put_flash(:info, gettext("You have been logged out!"))
    |> configure_session(drop: true)
    |> redirect(to: "/")
  end
end
