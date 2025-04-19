defmodule Codebattle.UserEvent do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Runner.AtomizedMap

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :user_id,
             :event_id,
             :state
           ]}

  schema "user_events" do
    belongs_to(:user, Codebattle.User)
    belongs_to(:event, Codebattle.Event)

    field(:state, AtomizedMap)

    timestamps()
  end

  @spec get_all() :: list(t())
  def get_all do
    Repo.all(__MODULE__)
  end

  @spec get_by_user_id_and_event_id(integer() | String.t(), integer() | String.t()) :: t() | nil
  def get_by_user_id_and_event_id(user_id, event_id) do
    Repo.one(from(ue in __MODULE__, where: ue.user_id == ^user_id and ue.event_id == ^event_id))
  end

  @spec get!(String.t()) :: t() | no_return()
  def get!(id) do
    Repo.get!(__MODULE__, id)
  end

  @spec get(String.t()) :: t() | no_return()
  def get(id) do
    Repo.get(__MODULE__, id)
  end

  @spec create(map()) :: {:ok, t()} | {:error, term()}
  def create(params) do
    %__MODULE__{}
    |> changeset(params)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, term()}
  def update(user_event, params) do
    user_event
    |> changeset(params)
    |> Repo.update!()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, term()}
  def delete(user_event) do
    Repo.delete(user_event)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(user_event, attrs \\ %{}) do
    cast(user_event, attrs, [:user_id, :event_id, :state])
  end
end
