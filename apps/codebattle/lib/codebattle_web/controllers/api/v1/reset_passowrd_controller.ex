defmodule CodebattleWeb.Api.V1.ResetPasswordController do
  use CodebattleWeb, :controller

  def create(conn, params) do
    user_attrs = %{
      email: params["email"]
    }

    case Codebattle.Auth.User.reset_in_firebase(user_attrs) do
      :ok ->
        json(conn, %{status: :created})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: reason})
    end
  end
end
