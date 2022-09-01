defmodule Codebattle.TaskForm do
  @moduledoc false

  import Ecto.Changeset

  alias Codebattle.Repo
  alias Codebattle.Task

  def create(params, user) do
    new_params =
      params
      |> Map.merge(%{
        "origin" => "user",
        "state" => "draft",
        "creator_id" => user.id
      })

    %Task{}
    |> changeset(new_params)
    |> Repo.insert()
  end

  def update(task, params, user) do
    new_params = params

    task
    |> changeset(new_params)
    |> Repo.update()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :examples,
      :description_ru,
      :description_en,
      :name,
      :level,
      :state,
      :origin,
      :visibility,
      :creator_id
    ])
    |> cast_json_field(params, :input_signature)
    |> cast_json_field(params, :output_signature)
    |> cast_asserts(params)
    |> cast_tags(params)
    |> validate_required([
      :examples,
      :description_en,
      :name,
      :level,
      :input_signature,
      :output_signature,
      :origin,
      :state,
      :visibility,
      :asserts
    ])
    |> validate_inclusion(:state, Task.states())
    |> validate_inclusion(:level, Task.levels())
    |> validate_inclusion(:origin, Task.origin_types())
    |> validate_inclusion(:visibility, Task.visibility_types())
    |> unique_constraint(:name)
  end

  defp cast_json_field(changeset, params, field) do
    case Jason.decode(params[to_string(field)]) do
      {:ok, value} -> put_change(changeset, field, value)
      {:error, reason} -> add_error(changeset, field, inspect(reason))
    end
  end

  defp cast_tags(changeset, params) do
    tags =
      params
      |> Map.get("tags", "")
      |> String.split(",")
      |> Enum.map(&String.trim/1)

    put_change(changeset, :tags, tags)
  end

  defp cast_asserts(changeset, params) do
    asserts =
      params
      |> Map.get("asserts", "[]")
      |> Jason.decode!()

    put_change(changeset, :asserts, asserts)
  end
end
