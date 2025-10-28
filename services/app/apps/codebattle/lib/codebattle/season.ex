defmodule Codebattle.Season do
  @moduledoc """
  Schema and context for seasons
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:id, :name, :year, :starts_at, :ends_at]}

  schema "seasons" do
    field(:name, :string)
    field(:year, :integer)
    field(:starts_at, :date)
    field(:ends_at, :date)
  end

  @spec get_current_season() :: t() | nil
  def get_current_season do
    Codebattle.SeasonCache.get_current_season()
  end

  @spec fetch_current_season_from_db :: t() | nil
  def fetch_current_season_from_db do
    today = Date.utc_today()

    __MODULE__
    |> where([s], s.starts_at <= ^today and s.ends_at >= ^today)
    |> Repo.one()
  end

  @spec get_all() :: list(t())
  def get_all do
    __MODULE__
    |> order_by([s], desc: s.year, desc: s.starts_at)
    |> Repo.all()
  end

  @spec get(String.t() | integer()) :: t() | nil
  def get(id) do
    Repo.get(__MODULE__, id)
  end

  @spec get!(String.t() | integer()) :: t() | no_return()
  def get!(id) do
    Repo.get!(__MODULE__, id)
  end

  @spec create(map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(attrs) do
    result =
      %__MODULE__{}
      |> changeset(attrs)
      |> Repo.insert()

    with {:ok, _season} <- result do
      Codebattle.SeasonCache.invalidate()
    end

    result
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(season, attrs) do
    result =
      season
      |> changeset(attrs)
      |> Repo.update()

    with {:ok, _season} <- result do
      Codebattle.SeasonCache.invalidate()
    end

    result
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(season) do
    result = Repo.delete(season)

    with {:ok, _season} <- result do
      Codebattle.SeasonCache.invalidate()
    end

    result
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(season, attrs \\ %{}) do
    season
    |> cast(attrs, [:name, :year, :starts_at, :ends_at])
    |> validate_required([:name, :year, :starts_at, :ends_at])
    |> validate_number(:year, greater_than: 2000, less_than: 3000)
    |> validate_dates()
  end

  defp validate_dates(changeset) do
    starts_at = get_field(changeset, :starts_at)
    ends_at = get_field(changeset, :ends_at)

    if starts_at && ends_at && Date.after?(starts_at, ends_at) do
      add_error(changeset, :ends_at, "must be after start date")
    else
      changeset
    end
  end
end
