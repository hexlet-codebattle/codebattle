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
    field(:users_count, :integer, virtual: true, default: 0)

    timestamps()
  end

  @spec get_all(term()) :: list(t())
  def get_all(preload \\ []) do
    __MODULE__ |> Repo.all() |> Repo.preload(preload)
  end

  @spec list_with_stats(keyword()) :: list(t())
  def list_with_stats(opts \\ []) do
    sort = Keyword.get(opts, :sort, "name")
    order = Keyword.get(opts, :order, "asc")
    preload = Keyword.get(opts, :preload, [])

    __MODULE__
    |> join(:left, [c], u in User, on: u.clan_id == c.id)
    |> group_by([c], c.id)
    |> select_merge([_c, u], %{users_count: count(u.id)})
    |> order_with_stats(sort, order)
    |> Repo.all()
    |> Repo.preload(preload)
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

  @spec get_by_ids([pos_integer()]) :: list(t())
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

  @doc "Creator and admins may rename a clan."
  @spec can_edit?(t(), User.t()) :: boolean()
  def can_edit?(%__MODULE__{creator_id: creator_id}, %User{id: user_id} = user) do
    User.admin?(user) or (not is_nil(creator_id) and creator_id == user_id)
  end

  @doc """
  Renames a clan (name / long name only). Members keep the clan name on their
  user row, so it is updated with the clan in one transaction.
  """
  @spec rename(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def rename(clan, attrs) do
    changeset = changeset(clan, Map.take(attrs, ["name", "long_name"]))

    Repo.transaction(fn ->
      case Repo.update(changeset) do
        {:ok, updated} -> set_members_clan(updated, from(u in User, where: u.clan_id == ^updated.id))
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end)
  end

  @doc "Creates a clan owned by `user`; with `join?` the user moves into it."
  @spec create_by(User.t(), map(), boolean()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create_by(user, attrs, join?) do
    attrs = attrs |> Map.take(["name", "long_name"]) |> Map.put("creator_id", user.id)

    members = if join?, do: from(u in User, where: u.id == ^user.id), else: from(u in User, where: false)

    Repo.transaction(fn ->
      case create(attrs) do
        {:ok, clan} -> set_members_clan(clan, members)
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end)
  end

  # Users keep the clan name next to clan_id; keep both in step.
  defp set_members_clan(clan, users_query) do
    Repo.update_all(users_query, set: [clan: clan.name, clan_id: clan.id])
    clan
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

  defp order_with_stats(queryable, "players_count", "desc") do
    order_by(queryable, [c, u], desc: count(u.id), asc: c.name)
  end

  defp order_with_stats(queryable, "players_count", _order) do
    order_by(queryable, [c, u], asc: count(u.id), asc: c.name)
  end

  defp order_with_stats(queryable, "created_at", "asc") do
    order_by(queryable, [c], asc: c.inserted_at, asc: c.name)
  end

  defp order_with_stats(queryable, "created_at", _order) do
    order_by(queryable, [c], desc: c.inserted_at, asc: c.name)
  end

  defp order_with_stats(queryable, _sort, "desc") do
    order_by(queryable, [c], desc: c.name)
  end

  defp order_with_stats(queryable, _sort, _order) do
    order_by(queryable, [c], asc: c.name)
  end
end
