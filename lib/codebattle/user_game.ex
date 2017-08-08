defmodule Codebattle.UserGame do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.UserGame

  schema "user_games" do
    field :user_id, :integer
    field :game_id, :integer
    field :result,  :string

    timestamps()
  end

  @doc false
  def changeset(%UserGame{} = user_game, attrs) do
    user_game
    |> cast(attrs, [:name, :email])
    |> validate_required([:name, :email])
  end
end
