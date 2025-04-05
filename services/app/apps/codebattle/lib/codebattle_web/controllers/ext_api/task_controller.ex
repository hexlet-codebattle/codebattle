defmodule CodebattleWeb.ExtApi.TaskController do
  use CodebattleWeb, :controller

  import Plug.Conn

  plug(CodebattleWeb.Plugs.TokenAuth)

  def create(conn, params) do
    params = for {k, v} <- params, into: %{}, do: {String.to_atom(k), v}

    case Codebattle.Task.changeset(%Codebattle.Task{}, params) do
      %{valid?: true} ->
        Codebattle.Task.upsert!(params)
        send_resp(conn, 201, "")

      %{valid?: false, errors: errors} ->
        errors = Map.new(errors, fn {k, {v, _}} -> {k, v} end)

        conn
        |> put_status(:bad_request)
        |> json(%{errors: errors})
    end
  end
end
