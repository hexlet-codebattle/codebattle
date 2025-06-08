defmodule Codebattle.StreamConfig do
  @moduledoc """
  Represents a user's stream configuration
  """
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User
  alias Runner.AtomizedMap

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder, only: [:id, :name, :user_id, :config, :inserted_at, :updated_at]}

  schema "stream_configs" do
    field(:name, :string)
    field(:config, AtomizedMap)
    belongs_to(:user, User)

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :user_id, :config])
    |> validate_required([:name, :user_id, :config])
    |> unique_constraint([:name, :user_id], name: :stream_configs_name_user_id_index)
  end

  @doc """
  Get all stream configs for a user
  """
  def get_all(user_id) do
    __MODULE__
    |> where([sc], sc.user_id == ^user_id)
    |> order_by([sc], asc: sc.name)
    |> Repo.all()
  end

  @doc """
  Upsert stream configs for a user
  This will:
  1. Create new configs that don't exist
  2. Update configs that already exist
  3. Delete configs that are not in the provided list
  """
  def upsert(user_id, configs) do
    # Get existing config names for this user
    existing_names =
      __MODULE__
      |> where([sc], sc.user_id == ^user_id)
      |> select([sc], sc.name)
      |> Repo.all()
      |> MapSet.new()

    # Get names from the configs we're upserting
    new_names = MapSet.new(configs, & &1["name"])

    # Names to delete (in existing but not in new)
    names_to_delete = MapSet.difference(existing_names, new_names)

    # Delete configs that are not in the provided list
    if MapSet.size(names_to_delete) > 0 do
      __MODULE__
      |> where([sc], sc.user_id == ^user_id and sc.name in ^MapSet.to_list(names_to_delete))
      |> Repo.delete_all()
    end

    # Upsert each config
    Enum.each(configs, fn config ->
      name = config["name"]

      case Repo.get_by(__MODULE__, name: name, user_id: user_id) do
        nil ->
          # Create new config
          %__MODULE__{}
          |> changeset(%{name: name, user_id: user_id, config: config})
          |> Repo.insert!()

        existing_config ->
          # Update existing config
          existing_config
          |> changeset(%{config: config})
          |> Repo.update!()
      end
    end)

    # Return the updated list of configs
    get_all(user_id)
  end
end
