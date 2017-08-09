defmodule Codebattle.Game do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Game

  schema "games" do
    field :state, :string

    timestamps()

    has_many :user_games, Codebattle.UserGame
    has_many :users, through: [:user_games, :user]
  end

  @doc false
  def changeset(%Game{} = game, attrs) do
    game
    |> cast(attrs, [:state])
    |> validate_required([:state])
  end
end
