defmodule Codebattle.GroupTaskRun do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTask

  @statuses ~w(pending success error)

  @type t :: %__MODULE__{}

  schema "group_task_runs" do
    belongs_to(:group_task, GroupTask)

    field(:player_ids, {:array, :integer}, default: [])
    field(:status, :string)
    field(:result, :map, default: %{})

    timestamps()
  end

  def changeset(group_task_run, attrs \\ %{}) do
    group_task_run
    |> cast(attrs, [:group_task_id, :player_ids, :status, :result])
    |> validate_required([:group_task_id, :player_ids, :status, :result])
    |> validate_length(:player_ids, min: 1)
    |> validate_inclusion(:status, @statuses)
    |> foreign_key_constraint(:group_task_id)
  end
end
