defmodule Codebattle.UserGameReport do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.User

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

  @states ~w(pending processed)a
  @reasons ~w(bot_cheated bot_wrong_solution user_copypasted)a

  schema "user_game_reports" do
    field(:reason, Ecto.Enum, values: @reasons)
    field(:state, Ecto.Enum, values: @states, default: :pending)
    field(:comment, :string)

    belongs_to(:game, Game)
    belongs_to(:reporter, User)
    belongs_to(:reported_user, User, foreign_key: :reported_user_id)

    timestamps()
  end

  def changeset(struct = %__MODULE__{}, params \\ %{}) do
    struct
    |> cast(params, [
      :game_id,
      :reporter_id,
      :reported_user_id,
      :reason,
      :comment
    ])
    |> validate_required([
      :game_id,
      :reporter_id,
      :reported_user_id,
      :reason,
      :comment
    ])
  end

  def get!(id), do: Repo.get!(__MODULE__, id)
  def get(id), do: Repo.get(__MODULE__, id)
  def get_by!(params), do: Repo.get_by!(__MODULE__, params)
  def get_by(params), do: Repo.get_by(__MODULE__, params)

  def list_by_game(game_id) do
    __MODULE__
    |> where([ugr], ugr.game_id == ^game_id)
    |> Repo.all()
  end

  def create(params) do
    %__MODULE__{}
    |> changeset(params)
    |> Repo.insert()
  end
end
