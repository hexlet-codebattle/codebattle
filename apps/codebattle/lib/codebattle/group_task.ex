defmodule Codebattle.GroupTask do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTaskSolution

  @type t :: %__MODULE__{}

  schema "group_tasks" do
    field(:slug, :string)
    field(:runner_url, :string)
    field(:time_to_solve_sec, :integer)

    has_many(:solutions, GroupTaskSolution)

    timestamps()
  end

  def changeset(group_task, attrs \\ %{}) do
    group_task
    |> cast(attrs, [:slug, :time_to_solve_sec, :runner_url])
    |> validate_required([:slug, :time_to_solve_sec])
    |> update_change(:slug, &normalize_slug/1)
    |> update_change(:runner_url, &normalize_runner_url/1)
    |> validate_length(:slug, min: 2, max: 255)
    |> validate_length(:runner_url, max: 500)
    |> validate_number(:time_to_solve_sec, greater_than: 0)
    |> unique_constraint(:slug)
  end

  defp normalize_slug(nil), do: nil
  defp normalize_slug(slug), do: slug |> String.trim() |> String.downcase()

  defp normalize_runner_url(nil), do: nil

  defp normalize_runner_url(runner_url) do
    case String.trim(runner_url) do
      "" -> nil
      value -> value
    end
  end
end
