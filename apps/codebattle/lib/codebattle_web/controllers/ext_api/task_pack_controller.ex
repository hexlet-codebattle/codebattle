defmodule CodebattleWeb.ExtApi.TaskPackController do
  use CodebattleWeb, :controller

  import Plug.Conn

  alias Codebattle.Repo
  alias Codebattle.Task
  alias Codebattle.TaskPack
  alias Runner.AtomizedMap

  plug(CodebattleWeb.Plugs.TokenAuth)

  def create(conn, params) do
    case Map.get(params, "task_pack") do
      task_pack_params when is_map(task_pack_params) ->
        process_task_pack(conn, params, task_pack_params)

      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Invalid task_pack payload"})
    end
  end

  defp process_task_pack(conn, params, task_pack_params) do
    visibility = Map.get(params, "visibility", "public")

    params =
      task_pack_params
      |> AtomizedMap.atomize()
      |> Map.put(:visibility, visibility)
      |> Map.put(:state, "active")

    task_names = Map.get(params, :task_names, [])
    tasks = Task.get_by_names(task_names)

    task_ids =
      task_names
      |> Enum.map(fn name ->
        task = Enum.find(tasks, fn task -> task.name == name end)

        if task do
          task.id
        end
      end)
      |> Enum.filter(& &1)

    params = Map.put(params, :task_ids, task_ids)

    case find_or_create_task_pack(params) do
      {:ok, _task_pack} ->
        send_resp(
          conn,
          201,
          "Created task pack with name: #{inspect(params.name)}, task_ids: #{inspect(task_ids)}"
        )

      {:error, %{errors: errors}} ->
        errors = Map.new(errors, fn {k, {v, _}} -> {k, v} end)

        conn
        |> put_status(:bad_request)
        |> json(%{errors: errors})
    end
  end

  defp find_or_create_task_pack(params) do
    case TaskPack.get_by(name: params.name) do
      nil ->
        case TaskPack.changeset(%TaskPack{}, params) do
          %{valid?: true} = changeset ->
            {:ok, Repo.insert!(changeset)}

          changeset ->
            {:error, changeset}
        end

      task_pack ->
        case TaskPack.changeset(task_pack, params) do
          %{valid?: true} = changeset ->
            {:ok, Repo.update!(changeset)}

          changeset ->
            {:error, changeset}
        end
    end
  end
end
