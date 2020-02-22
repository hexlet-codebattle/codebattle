defmodule Codebattle.Game do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.Game

  def level_difficulties do
    %{"elementary" => 0, "easy" => 1, "medium" => 2, "hard" => 3}
  end

  @derive {Poison.Encoder, only: [:id, :users, :state, :starts_at, :finishs_at]}
  @types ~w(public bot tournament private)

  schema "games" do
    field(:state, :string)
    field(:level, :string)
    field(:type, :string)
    field(:starts_at, :naive_datetime)
    field(:finishs_at, :naive_datetime)

    timestamps()

    belongs_to(:task, Codebattle.Task)
    has_many(:user_games, Codebattle.UserGame)
    has_many(:users, through: [:user_games, :user])
  end

  @doc false
  def changeset(%Game{} = game, attrs) do
    game
    |> cast(attrs, [:state, :task_id, :level, :type, :starts_at, :finishs_at])
    |> validate_required([:state, :level, :type])
    |> validate_inclusion(:type, @types)
  end
end
