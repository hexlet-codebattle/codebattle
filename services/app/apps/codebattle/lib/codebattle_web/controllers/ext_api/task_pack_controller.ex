defmodule CodebattleWeb.ExtApi.TaskPackController do
  use CodebattleWeb, :controller

  import Plug.Conn

  alias Codebattle.Repo
  alias Codebattle.Task
  alias Codebattle.TaskPack
  alias Runner.AtomizedMap

  plug(CodebattleWeb.Plugs.TokenAuth)

  def create(conn, params) do
    params = AtomizedMap.atomize(params)

    task_names = Map.get(params, :task_names, [])
    tasks = Task.get_by_names(task_names)
    task_ids = Enum.map(task_names, fn name -> tasks |> Enum.find(fn task -> task.name == name end) |> Map.get(:id) end)

    params = Map.put(params, :task_ids, task_ids)

    case find_or_create_task_pack(params) do
      {:ok, _task_pack} ->
        send_resp(conn, 201, "Created task pack with name: #{params.name}, task_ids: #{task_ids}")

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
