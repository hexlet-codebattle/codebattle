defmodule CodebattleWeb.Api.V1.GroupTaskSolutionController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTask.Context

  def create(conn, params) do
    if FunWithFlags.enabled?(:group_tasks_api) do
      conn
      |> fetch_bearer_token()
      |> create_solution(conn, params)
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "group_tasks_api_disabled"})
    end
  end

  defp fetch_bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, String.trim(token)}
      _ -> :error
    end
  end

  defp create_solution({:ok, token}, conn, params) do
    case Context.create_solution_from_token(token, params) do
      {:ok, solution} ->
        conn
        |> put_status(:created)
        |> json(%{
          group_task_solution: %{
            id: solution.id,
            group_task_id: solution.group_task_id,
            inserted_at: solution.inserted_at,
            lang: solution.lang,
            user_id: solution.user_id
          }
        })

      {:error, :invalid_token} ->
        unauthorized(conn)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: translate_errors(changeset)})
    end
  end

  defp create_solution(:error, conn, _params), do: unauthorized(conn)

  defp unauthorized(conn) do
    conn
    |> put_status(:unauthorized)
    |> json(%{error: "unauthorized"})
  end
end
