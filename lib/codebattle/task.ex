defmodule Codebattle.Task do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Task


  schema "tasks" do
    field :description, :string

    timestamps()
  end

  @doc false
  def changeset(%Task{} = task, attrs) do
    task
    |> cast(attrs, [:description])
    |> validate_required([:description])
  end
end
