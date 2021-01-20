defmodule Codebattle.Task do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @derive {Jason.Encoder, only: [:id, :name, :level, :description]}

  schema "tasks" do
    field(:description, :string)
    field(:name, :string)
    field(:level, :string)
    field(:input_signature, {:array, :map})
    field(:output_signature, :map)
    field(:asserts, :string)
    field(:disabled, :boolean)
    field(:count, :integer, virtual: true)
    field(:task_id, :integer, virtual: true)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :description,
      :name,
      :level,
      :input_signature,
      :output_signature,
      :asserts,
      :disabled
    ])
    |> validate_required([:description, :name, :level, :asserts])
    |> unique_constraint(:name)
  end

  def visible(query) do
    from(t in query, where: t.disabled == false)
  end

  def invisible(query) do
    from(t in query, where: t.disabled == true)
  end

  def get_asserts(task) do
    task
    |> Map.get(:asserts)
    |> String.split("\n")
    |> filter_empty_items()
    |> Enum.map(&Jason.decode!/1)
  end

  def get_shuffled_tasks(level) do
    from(task in Codebattle.Task, where: task.level == ^level)
    |> visible()
    |> Codebattle.Repo.all()
    |> Enum.shuffle()
  end

  defp filter_empty_items(items), do: items |> Enum.filter(&(&1 != ""))
end
