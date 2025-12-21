defmodule CodebattleWeb.ExtApi.TaskController do
  use CodebattleWeb, :controller

  import Plug.Conn

  plug(CodebattleWeb.Plugs.TokenAuth)

  def create(conn, params) do
    task_params = Map.get(params, "task")
    origin = Map.get(params, "origin")
    visibility = Map.get(params, "visibility")

    params =
      task_params
      |> Map.put("state", "active")
      |> Map.put("origin", origin)
      |> Map.put("visibility", visibility)
      |> Runner.AtomizedMap.atomize()

    case Codebattle.Task.changeset(%Codebattle.Task{}, params) do
      %{valid?: true} ->
        params |> Codebattle.Task.upsert!() |> dbg()
        send_resp(conn, 201, "")

      %{valid?: false, errors: errors} ->
        errors = Map.new(errors, fn {k, {v, _}} -> {k, v} end)

        conn
        |> put_status(:bad_request)
        |> json(%{errors: errors})
    end
  end
end
