defmodule Codebattle.Task do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  @derive {Poison.Encoder, only: [:id, :name, :level, :description]}

  schema "tasks" do
    field(:description, :string)
    field(:name, :string)
    field(:level, :string)
    field(:input, :string)
    field(:output, :string)
    field(:asserts, :string)
    field(:count, :integer, virtual: true)
    field(:task_id, :integer, virtual: true)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:description, :name, :level, :input, :output, :asserts])
    |> validate_required([:description, :name, :level, :asserts])
    |> unique_constraint(:name)
  end
end
