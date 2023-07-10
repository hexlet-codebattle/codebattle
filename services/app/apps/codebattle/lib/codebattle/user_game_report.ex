defmodule Codebattle.UserGameReport do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  # import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.{Game, User}

  @type t :: %__MODULE__{}

  @states ~w(pending processed)

  schema "user_game_reports" do
    field(:reason, :string)
    field(:comment, :string)
    field(:state, :string, default: "pending")

    belongs_to(:game, Game)
    belongs_to(:user, User)

    timestamps()
  end

  def changeset(player_report = %__MODULE__{}, params \\ %{}) do
    player_report
    |> cast(params, [])
    |> validate_required([
      :game_id,
      :user_id,
      :reason,
      :comment
    ])
    |> validate_inclusion(:state, @states)
  end

  def get!(id), do: Repo.get!(__MODULE__, id)
  def get(id), do: Repo.get(__MODULE__, id)
  def get_by!(params), do: Repo.get_by!(__MODULE__, params)
  def get_by(params), do: Repo.get_by(__MODULE__, params)
end
