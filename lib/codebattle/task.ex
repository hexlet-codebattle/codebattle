defmodule Codebattle.Task do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Task


  schema "tasks" do
    field :description, :string
    field :name, :string
    field :level, :string
    field :asserts, :string

    timestamps()
  end

  @doc false
  def changeset(%Task{} = task, attrs) do
    task
    |> cast(attrs, [:description, :name, :level, :asserts])
    |> validate_required([:description, :name, :level, :asserts])
    |> unique_constraint(:name)
  end
end
