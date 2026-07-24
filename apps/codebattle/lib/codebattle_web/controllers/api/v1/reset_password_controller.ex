defmodule CodebattleWeb.Api.V1.ResetPasswordController do
  use CodebattleWeb, :controller

  plug(
    CodebattleWeb.Plugs.RateLimit,
    [bucket: "reset_password", limit: 5, window: to_timeout(minute: 15)] when action in [:create]
  )

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
