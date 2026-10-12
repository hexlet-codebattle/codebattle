defmodule CodebattleWeb.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.UserApiToken
  alias CodebattleWeb.Api.V1.SettingsController
  alias CodebattleWeb.NewFrontend

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
    conn =
      put_meta_tags(conn, %{
        url: Routes.user_path(conn, :show, user_name)
      })

    # The new frontend renders the profile as an Inertia page and loads the
    # stats itself from the API (same endpoints as the legacy widget).
    if NewFrontend.enabled?(conn) do
      conn
      |> NewFrontend.maybe_put_layout()
      |> render_inertia("UserProfile", %{"user_id" => user_name})
    else
      render(conn, "show.html")
    end
  end

  def edit(conn, _params) do
    conn =
      put_meta_tags(conn, %{
        url: Routes.user_setting_path(conn, :edit)
      })

    # Account fields (email, sound, linked accounts) and sessions come from the
    # shared props on /settings; tokens are listed here to skip a request.
    if NewFrontend.enabled?(conn) do
      user = conn.assigns.current_user

      conn
      |> NewFrontend.maybe_put_layout()
      |> render_inertia("Settings", %{
        "api_tokens" => Enum.map(UserApiToken.list_active(user.id), &SettingsController.present_api_token/1),
        "api_token_scopes" => SettingsController.available_scopes(user)
      })
    else
      render(conn, "edit.html")
    end
  end
end
