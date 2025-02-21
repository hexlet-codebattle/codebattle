defmodule Codebattle.Customization do
  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.Repo

  schema "customizations" do
    field(:key, :string)
    field(:value, :string)
  end

  @doc false
  def changeset(customization, attrs) do
    customization
    |> cast(attrs, [:key, :value])
    |> validate_required([:key, :value])
  end

  def upsert(key, value) do
    Repo.insert(%__MODULE__{key: key, value: value},
      on_conflict: [set: [value: value]],
      conflict_target: [:key]
    )
  end

  def get(key) do
    case Repo.get_by(__MODULE__, key: key) do
      nil -> nil
      customization -> customization.value
    end
  end
end
