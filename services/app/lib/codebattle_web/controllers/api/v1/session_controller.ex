defmodule CodebattleWeb.Api.V1.SessionController do
  use CodebattleWeb, :controller

  def create(conn, params) do
    auth = %{
      email: params["email"],
      uid: params["uid"]
    }

    case Codebattle.Oauth.User.find(auth) do
      {:ok, user} ->
        conn
        |> put_session(:user_id, user.id)
        |> json(%{status: :created})

      {:error, reason} ->
        json(conn, %{errors: reason})
    end
  end
end
