defmodule Codebattle.Game do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.Game

  def level_difficulties do
    %{"elementary" => 0, "easy" => 1, "medium" => 2, "hard" => 3}
  end

  @derive {Poison.Encoder, only: [:id, :users, :state]}

  schema "games" do
    field(:state, :string)
    field(:task_level, :string)
    field(:duration_in_seconds, :integer)
    field(:type, :string)

    timestamps()

    belongs_to(:task, Codebattle.Task)
    has_many(:user_games, Codebattle.UserGame)
    has_many(:users, through: [:user_games, :user])
  end

  @doc false
  def changeset(%Game{} = game, attrs) do
    game
    |> cast(attrs, [:state, :task_id, :task_level, :duration_in_seconds, :type])
    |> validate_required([:state])

    # |> cast_assoc(:task, required: false)
  end
end
