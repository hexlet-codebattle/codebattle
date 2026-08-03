defmodule CodebattleWeb.UserController do
  use CodebattleWeb, :controller

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:edit, :show])
  plug(:put_view, CodebattleWeb.UserView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def new(conn, _params) do
    if FunWithFlags.enabled?(:use_only_token_auth) do
      render(conn, "token_only.html")
    else
      render(conn, "new.html")
    end
  end

  def show(conn, %{"id" => user_name}) do
    conn
    |> put_meta_tags(%{
      url: Routes.user_path(conn, :show, user_name)
    })
    |> render("show.html")
  end

  def edit(conn, _params) do
    conn
    |> put_meta_tags(%{
      url: Routes.user_setting_path(conn, :edit)
    })
    |> render("edit.html")
  end
end
