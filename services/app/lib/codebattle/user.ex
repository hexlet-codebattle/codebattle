defmodule Codebattle.User do
  @moduledoc """
    Represents authenticatable user
  """
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Poison.Encoder, only: [:id, :name, :rating, :guest, :github_id]}

  schema "users" do
    field(:name, :string)
    field(:email, :string)
    field(:github_id, :integer)
    field(:rating, :integer)
    field(:guest, :boolean, virtual: true, default: false)
    field(:bot, :boolean, virtual: true, default: false)

    has_many(:user_games, Codebattle.UserGame)
    has_many(:games, through: [:user_games, :game])

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :email, :github_id, :rating])
    |> validate_required([:name, :email, :github_id])
  end
end
