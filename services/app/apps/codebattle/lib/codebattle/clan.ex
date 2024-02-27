defmodule Codebattle.Clan do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.Repo

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:id, :name]}

  schema "clans" do
    belongs_to(:creator, Codebattle.User)

    field(:name, :string)

    timestamps()
  end

  @spec get_all() :: list(t())
  def get_all() do
    Repo.all(__MODULE__)
  end

  @spec get!(String.t()) :: t() | no_return()
  def get!(id) do
    Repo.get!(__MODULE__, id)
  end

  @spec get_by_name!(String.t()) :: t() | no_return()
  def get_by_name!(name) do
    Repo.get_by!(__MODULE__, name: String.downcase(name))
  end

  @spec find_or_create_by_clan(String.t(), pos_integer()) :: {:ok, t()} | {:error, term()}
  def find_or_create_by_clan(name, user_id) do
    name
    |> String.trim()
    |> String.downcase()
    |> String.replace(~r/[^\p{L}\p{M}\p{N}\p{P}\p{S}\p{Z}\p{C}]/u, "")
    |> then(fn name ->
      Repo.get_by(__MODULE__, name: name)
    end)
    |> case do
      nil ->
        %__MODULE__{}
        |> changeset(%{name: name, creator_id: user_id})
        |> Repo.insert()

      clan ->
        {:ok, clan}
    end
  end

  defp changeset(clan, attrs) do
    clan
    |> cast(attrs, [:name, :creator_id])
    |> validate_length(:name, min: 2, max: 39)
    |> unique_constraint(:name)
  end
end
