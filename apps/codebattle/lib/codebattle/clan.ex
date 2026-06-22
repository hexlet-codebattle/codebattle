defmodule Codebattle.Clan do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:id, :name, :long_name]}

  schema "clans" do
    belongs_to(:creator, User)
    has_many(:users, User)

    field(:name, :string)
    field(:long_name, :string)

    timestamps()
  end

  @spec get_all(term()) :: list(t())
  def get_all(preload \\ []) do
    __MODULE__ |> Repo.all() |> Repo.preload(preload)
  end

  @spec search(String.t(), term()) :: list(t())
  def search(query, preload \\ []) do
    query = String.trim(query)

    __MODULE__
    |> maybe_filter_by_query(query)
    |> order_by([c], asc: c.name)
    |> Repo.all()
    |> Repo.preload(preload)
  end

  @spec get(String.t() | integer(), term()) :: t() | nil
  def get(id, preload \\ []) do
    __MODULE__ |> Repo.get(id) |> Repo.preload(preload)
  end

  @spec get!(String.t() | integer(), term()) :: t() | no_return()
  def get!(id, preload \\ []) do
    __MODULE__ |> Repo.get!(id) |> Repo.preload(preload)
  end

  @spec get_by_name!(String.t()) :: t() | no_return()
  def get_by_name!(name) do
    Repo.get_by!(__MODULE__, name: name)
  end

  @spec get_by_ids(String.t()) :: list(t())
  def get_by_ids(ids) do
    __MODULE__
    |> where([c], c.id in ^ids)
    |> Repo.all()
  end

  @spec find_or_create_by_clan(String.t(), pos_integer()) :: {:ok, t()} | {:error, term()}
  def find_or_create_by_clan(name, user_id) do
    name = String.replace(name, ~r/[^\p{L}\p{M}\p{N}\p{P}\p{S}\p{Z}\p{C}]/u, "")
    trimmed_name = String.trim(name)

    {name, trimmed_name}
    |> then(fn {name, trimmed_name} ->
      __MODULE__
      |> where(
        [c],
        c.name == ^name or c.long_name == ^name or c.name == ^trimmed_name or
          c.long_name == ^trimmed_name
      )
      |> limit(1)
      |> Repo.one()
    end)
    |> case do
      nil ->
        %__MODULE__{}
        |> changeset(%{name: name, long_name: name, creator_id: user_id})
        |> Repo.insert()

      clan ->
        {:ok, clan}
    end
  end

  @spec create(map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(attrs) do
    %__MODULE__{}
    |> changeset(attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(clan, attrs) do
    clan
    |> changeset(attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(clan), do: Repo.delete(clan)

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(clan, attrs \\ %{}) do
    clan
    |> cast(attrs, [:name, :long_name, :creator_id])
    |> validate_required([:name])
    |> validate_length(:name, min: 2, max: 256)
    |> validate_length(:long_name, min: 2, max: 256)
    |> unique_constraint(:name)
  end

  defp maybe_filter_by_query(queryable, ""), do: queryable

  defp maybe_filter_by_query(queryable, query) do
    pattern = "%#{query}%"

    where(
      queryable,
      [c],
      ilike(c.name, ^pattern) or ilike(c.long_name, ^pattern)
    )
  end
end
