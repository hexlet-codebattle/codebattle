defmodule CodebattleWeb.Api.V1.SessionController do
  use CodebattleWeb, :controller

  def create(conn, params) do
    user_attrs = %{
      email: params["email"],
      password: params["password"]
    }

    case Codebattle.Oauth.User.find_by_firebase(user_attrs) do
      {:ok, user} ->
        conn
        |> put_session(:user_id, user.id)
        |> json(%{status: :created})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: reason})
    end
  end
end
