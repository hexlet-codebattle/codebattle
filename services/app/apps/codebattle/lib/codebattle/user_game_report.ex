defmodule Codebattle.UserGameReport do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  # import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.{Game, User}

  @derive {Jason.Encoder,
           only: [
             :id,
             :reported_user_id,
             :reporter_id,
             :reason,
             :comment,
             :state
           ]}

  @type t :: %__MODULE__{}

  @states ~w(pending processed)

  schema "user_game_reports" do
    field(:reason, :string)
    field(:comment, :string)
    field(:state, :string, default: "pending")

    belongs_to(:game, Game)
    belongs_to(:reporter, User)
    belongs_to(:reported_user, User, foreign_key: :reported_user_id)

    timestamps()
  end

  def changeset(struct = %__MODULE__{}, params \\ %{}) do
    struct
    |> cast(params, [])
    |> validate_required([
      :game_id,
      :reporter_id,
      :reported_user_id,
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
