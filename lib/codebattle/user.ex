defmodule Codebattle.User do
  @moduledoc """
    Represents authenticatable user
  """
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :name, :string
    field :email, :string
    field :github_id, :integer

    timestamps()

    has_many :user_games, Codebattle.UserGame
    has_many :games, through: [:user_games, :game]
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
