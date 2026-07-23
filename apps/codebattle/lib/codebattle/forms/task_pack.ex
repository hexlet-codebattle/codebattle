defmodule Codebattle.TaskPackForm do
  @moduledoc false

  import Ecto.Changeset

  alias Codebattle.Repo
  alias Codebattle.TaskPack

  @task_id_range 1..2_147_483_647
  @max_task_ids 10_000

  def create(params, user) do
    new_params = Map.merge(params, %{"state" => "draft", "creator_id" => user.id})

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
    raw_task_ids = Map.get(params, "task_ids", "")

    if is_binary(raw_task_ids) do
      cast_binary_task_ids(changeset, raw_task_ids)
    else
      add_error(changeset, :task_ids, "Please provide only integers with comma separated values")
    end
  end

  defp cast_binary_task_ids(changeset, raw_task_ids) do
    tokens = String.split(raw_task_ids, ",", trim: false)

    cond do
      length(tokens) > @max_task_ids ->
        add_error(changeset, :task_ids, "Please provide no more than #{@max_task_ids} task ids")

      Enum.any?(tokens, &(not Regex.match?(~r/^\s*\d+\s*$/, &1))) ->
        add_error(changeset, :task_ids, "Please provide only integers with comma separated values")

      true ->
        cast_parsed_task_ids(changeset, tokens)
    end
  end

  defp cast_parsed_task_ids(changeset, tokens) do
    task_ids = Enum.map(tokens, &(&1 |> String.trim() |> String.to_integer()))

    if Enum.all?(task_ids, &(&1 in @task_id_range)) do
      put_change(changeset, :task_ids, task_ids)
    else
      add_error(
        changeset,
        :task_ids,
        "Please provide integers between 1 and 2147483647 with comma separated values"
      )
    end
  end
end
