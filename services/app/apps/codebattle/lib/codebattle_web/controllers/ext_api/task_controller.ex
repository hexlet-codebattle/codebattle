defmodule CodebattleWeb.ExtApi.TaskController do
  use CodebattleWeb, :controller

  import Plug.Conn

  plug(CodebattleWeb.Plugs.TokenAuth)

  def create(conn, params) do
    payload = Map.get(params, "payload")
    origin = Map.get(params, "origin")
    visibility = Map.get(params, "visibility")

    with {:ok, gzipped_data} <- decode_base64(payload),
         {:ok, json_data} <- decompress_gzip(gzipped_data),
         {:ok, tasks_list} <- Jason.decode(json_data) do
      results =
        Enum.map(tasks_list, fn task_params ->
          params =
            task_params
            |> Map.put("state", "active")
            |> Map.put("origin", origin)
            |> Map.put("visibility", visibility)
            |> Runner.AtomizedMap.atomize()

          case Codebattle.Task.changeset(%Codebattle.Task{}, params) do
            %{valid?: true} ->
              Codebattle.Task.upsert!(params)
              {:ok, task_params}

            %{valid?: false, errors: errors} ->
              {:error, task_params, errors}
          end
        end)

      errors =
        results
        |> Enum.filter(fn
          {:error, _, _} -> true
          _ -> false
        end)
        |> Enum.map(fn {:error, task, errors} ->
          %{
            task: task,
            errors: Map.new(errors, fn {k, {v, _}} -> {k, v} end)
          }
        end)

      success_count =
        Enum.count(results, fn
          {:ok, _} -> true
          _ -> false
        end)

      if Enum.empty?(errors) do
        conn
        |> put_status(:created)
        |> json(%{success: success_count})
      else
        conn
        |> put_status(:bad_request)
        |> json(%{success: success_count, errors: errors})
      end
    else
      {:error, _reason} ->
        conn
        |> put_status(:bad_request)
        |> json(%{errors: %{payload: "Invalid gzipped payload format"}})
    end
  end

  defp decompress_gzip(data) do
    {:ok, :zlib.gunzip(data)}
  rescue
    _ -> {:error, :invalid_gzip}
  end

  defp decode_base64(data) do
    case Base.decode64(data) do
      {:ok, decoded} -> {:ok, decoded}
      :error -> {:error, :invalid_base64}
    end
  end
end
