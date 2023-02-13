defmodule Codebattle.TaskPackForm do
  @moduledoc false

  import Ecto.Changeset

  alias Codebattle.Repo
  alias Codebattle.TaskPack

  def create(params, user) do
    new_params =
      params
      |> Map.merge(%{
        "state" => "draft",
        "creator_id" => user.id
      })

    %TaskPack{}
    |> changeset(new_params)
    |> Repo.insert()
  end

  def update(task, params, _) do
    new_params = params

    task
    |> changeset(new_params)
    |> Repo.update()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :name,
      :state,
      :visibility,
      :creator_id
    ])
    |> cast_task_ids(params)
    |> validate_required([
      :name,
      :state,
      :visibility,
      :creator_id,
      :task_ids
    ])
    |> validate_inclusion(:state, TaskPack.states())
    |> validate_inclusion(:visibility, TaskPack.visibility_types())
    |> unique_constraint(:name)
  end

  defp cast_task_ids(changeset, params) do
    task_ids =
      params
      |> Map.get("task_ids", "")
      |> String.split(",")
      |> Enum.map(&String.trim/1)
      |> Enum.map(&String.to_integer/1)

    put_change(changeset, :task_ids, task_ids)
  end
end
