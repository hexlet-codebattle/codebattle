defmodule CodebattleWeb.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.UserApiToken
  alias CodebattleWeb.Api.V1.SettingsController
  alias CodebattleWeb.AuthPage
  alias CodebattleWeb.Frontend

  plug(CodebattleWeb.Plugs.RequireAuth when action in [:edit, :show])

  def new(%{assigns: %{current_user: %{is_guest: false}}} = conn, params) do
    redirect(conn, to: AuthPage.safe_next(params["next"]))
  end

  def new(conn, _params) do
    AuthPage.render(conn, if(FunWithFlags.enabled?(:use_only_token_auth), do: "token_only", else: "sign_up"))
  end

  def show(conn, %{"id" => user_name}) do
    conn =
      put_meta_tags(conn, %{
        url: Routes.user_path(conn, :show, user_name)
      })

    # The profile page loads the stats itself from the API.
    conn
    |> Frontend.put_layout()
    |> render_inertia("UserProfile", %{"user_id" => user_name})
  end

  def edit(conn, _params) do
    conn =
      put_meta_tags(conn, %{
        url: Routes.user_setting_path(conn, :edit)
      })

    # Account fields (email, sound, linked accounts) and sessions come from the
    # shared props on /settings; tokens are listed here to skip a request.
    user = conn.assigns.current_user

    conn
    |> Frontend.put_layout()
    |> render_inertia("Settings", %{
      "api_tokens" => Enum.map(UserApiToken.list_active(user.id), &SettingsController.present_api_token/1),
      "api_token_scopes" => SettingsController.available_scopes(user)
    })
  end
end
