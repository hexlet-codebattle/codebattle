defmodule Codebattle.UserGameReport do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User

  @derive {Jason.Encoder,
           only: [
             :comment,
             :game_id,
             :id,
             :offender_id,
             :reason,
             :reporter_id,
             :inserted_at,
             :state,
             :tournament_id
           ]}

  @type t :: %__MODULE__{}

  @states ~w(pending processed confirmed denied)a
  @reasons ~w(cheater wrong_solution copypaste)a

  schema "user_game_reports" do
    field(:reason, Ecto.Enum, values: @reasons)
    field(:state, Ecto.Enum, values: @states, default: :pending)
    field(:comment, :string)

    belongs_to(:game, Game)
    belongs_to(:tournament, Tournament)
    belongs_to(:reporter, User)
    belongs_to(:offender, User, foreign_key: :offender_id)

    timestamps()
  end

  def changeset(%__MODULE__{} = struct, params \\ %{}) do
    struct
    |> cast(params, [
      :comment,
      :game_id,
      :state,
      :offender_id,
      :reason,
      :reporter_id,
      :tournament_id
    ])
    |> validate_required([
      :comment,
      :game_id,
      :offender_id,
      :reason,
      :reporter_id
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
    |> Repo.preload([:offender, :reporter])
  end

  def list_by_tournament(tournament_id, opts \\ []) do
    __MODULE__
    |> where([ugr], ugr.tournament_id == ^tournament_id)
    |> apply_filters(opts)
    |> Repo.all()
  end

  def apply_filters(query, [:limit, limit] = opts) do
    query
    |> limit(^limit)
    |> apply_filters(Keyword.delete(opts, :limit))
  end

  def apply_filters(query, [:offset, offset] = opts) do
    query
    |> offset(^offset)
    |> apply_filters(Keyword.delete(opts, :offset))
  end

  def apply_filters(query, _opts), do: query

  def create(params) do
    result =
      %__MODULE__{}
      |> changeset(params)
      |> Repo.insert()

    case result do
      {:ok, report} -> {:ok, Repo.preload(report, [:offender, :reporter])}
      _ -> result
    end
  end

  def update(report, params) do
    result =
      report
      |> changeset(params)
      |> Repo.update()

    case result do
      {:ok, report} -> {:ok, Repo.preload(report, [:offender, :reporter])}
      _ -> result
    end
  end

  def mark_as_confirmed(tournament_id, offender_id) do
    __MODULE__
    |> where([ugr], ugr.tournament_id == ^tournament_id and ugr.offender_id == ^offender_id)
    |> Repo.update_all(set: [state: :confirmed])
  end
end
