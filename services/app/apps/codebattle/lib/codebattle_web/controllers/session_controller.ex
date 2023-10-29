defmodule CodebattleWeb.SessionController do
  use CodebattleWeb, :controller

  def new(conn, _params) do
    if Application.get_env(:codebattle, :use_only_token_auth) do
      render(conn, "token_only.html")
    else
      render(conn, "index.html")
    end
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
