defmodule Codebattle.GroupTaskSolution do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTask
  alias Codebattle.User

  @type t :: %__MODULE__{}

  schema "group_task_solutions" do
    belongs_to(:user, User)
    belongs_to(:group_task, GroupTask)

    field(:solution, :string)
    field(:lang, :string)

    timestamps(updated_at: false)
  end

  def changeset(group_task_solution, attrs \\ %{}) do
    group_task_solution
    |> cast(attrs, [:user_id, :group_task_id, :solution, :lang])
    |> validate_required([:user_id, :group_task_id, :solution, :lang])
    |> update_change(:solution, &String.trim/1)
    |> update_change(:lang, &normalize_lang/1)
    |> validate_length(:solution, min: 1)
    |> validate_length(:lang, min: 1, max: 100)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_task_id)
  end

  defp normalize_lang(nil), do: nil
  defp normalize_lang(lang), do: lang |> String.trim() |> String.downcase()
end
