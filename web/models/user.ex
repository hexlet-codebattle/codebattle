defmodule Codebattle.User do
  @moduledoc """
    Represents authenticatable user
  """
  use Codebattle.Web, :model

  schema "users" do
    field :name, :string
    field :email, :string
    field :github_id, :integer

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :email, :github_id])
    |> validate_required([:name, :email, :github_id])
  end
end
