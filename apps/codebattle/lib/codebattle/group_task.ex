defmodule Codebattle.GroupTask do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTaskToken

  @type t :: %__MODULE__{}

  schema "group_tasks" do
    field(:slug, :string)
    field(:time_to_solve_sec, :integer)

    has_many(:solutions, GroupTaskSolution)
    has_many(:tokens, GroupTaskToken)

    timestamps()
  end

  def changeset(group_task, attrs \\ %{}) do
    group_task
    |> cast(attrs, [:slug, :time_to_solve_sec])
    |> validate_required([:slug, :time_to_solve_sec])
    |> update_change(:slug, &normalize_slug/1)
    |> validate_length(:slug, min: 2, max: 255)
    |> validate_number(:time_to_solve_sec, greater_than: 0)
    |> unique_constraint(:slug)
  end

  defp normalize_slug(nil), do: nil
  defp normalize_slug(slug), do: slug |> String.trim() |> String.downcase()
end
