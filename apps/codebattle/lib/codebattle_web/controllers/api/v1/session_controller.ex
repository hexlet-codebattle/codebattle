defmodule CodebattleWeb.Api.V1.SessionController do
  use CodebattleWeb, :controller

  alias CodebattleWeb.UserAuth

  def create(conn, params) do
    user_attrs = %{
      email: params["email"],
      password: params["password"]
    }

    case Codebattle.Auth.User.find_by_firebase(user_attrs) do
      {:ok, user} ->
        conn
        |> UserAuth.log_in_user(user)
        |> json(%{status: :created})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: reason})
    end
  end
end
