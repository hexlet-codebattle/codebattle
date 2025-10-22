defmodule Codebattle.SqlTask do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :type,
             :name,
             :level,
             :description_ru,
             :description_en,
             :tags,
             :state,
             :origin,
             :visibility,
             :creator_id,
             :sql_text,
           ]}

  @task_type "sql"
  @levels ~w(elementary easy medium hard)
  @states ~w(blank draft on_moderation active disabled)
  @origin_types ~w(github user)
  @visibility_types ~w(hidden public)

  schema "sql_tasks" do
    field(:description_ru, :string)
    field(:description_en, :string)
    field(:type, :string, default: @task_type)
    field(:name, :string)
    field(:level, :string, default: "elementary")
    field(:disabled, :boolean)
    field(:count, :integer, virtual: true)
    field(:tags, {:array, :string}, default: [])
    field(:state, :string, default: "blank")
    field(:visibility, :string, default: "public")
    field(:origin, :string)
    field(:creator_id, :integer)
    field(:sql_text, :string, default: "")

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :description_ru,
      :description_en,
      :name,
      :type,
      :level,
      :disabled,
      :tags,
      :state,
      :origin,
      :visibility,
      :creator_id,
      :sql_text,
    ])
    |> validate_required([:description_en, :name, :level, :sql_text])
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:level, @levels)
    |> validate_inclusion(:origin, @origin_types)
    |> validate_inclusion(:visibility, @visibility_types)
    |> unique_constraint(:name)
  end

  def create_empty(creator_id),
    do: %Codebattle.SqlTask{
      name: "empty",
      description_ru: "",
      description_en: "",
      level: "elementary",
      tags: [],
      disabled: true,
      state: "blank",
      visibility: "public",
      origin: "user",
      creator_id: creator_id,
    }
end
