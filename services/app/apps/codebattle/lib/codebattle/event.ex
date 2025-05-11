defmodule Codebattle.Event do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Runner.AtomizedMap

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :description,
             :id,
             :personal_tournament_id,
             :slug,
             :stages,
             :starts_at,
             :ticker_text,
             :title,
             :type
           ]}

  @types ~w(public private)

  schema "events" do
    belongs_to(:creator, Codebattle.User)

    field(:slug, :string)
    field(:type, :string)
    field(:ticker_text, :string)
    field(:title, :string)
    field(:description, :string)
    field(:starts_at, :utc_datetime)
    field(:personal_tournament_id, :integer)

    embeds_many :stages, __MODULE__.Stage, on_replace: :delete, primary_key: false do
      @derive {Jason.Encoder,
               only: [
                 :action_button_text,
                 :confirmation_text,
                 :dates,
                 :name,
                 :slug,
                 :status,
                 :tournament_id,
                 :playing_type,
                 :type
               ]}

      field(:action_button_text, :string)
      field(:confirmation_text, :string)
      field(:dates, :string)
      field(:name, :string)
      field(:slug, :string)
      field(:status, Ecto.Enum, values: [:pending, :passed, :active])
      field(:tournament_id, :integer)
      field(:playing_type, Ecto.Enum, values: [:single, :global])
      field(:tournament_meta, AtomizedMap)
      field(:type, Ecto.Enum, values: [:tournament, :entrance])
    end

    timestamps()
  end

  @spec get_stage(t(), String.t()) :: __MODULE__.Stage.t() | nil
  def get_stage(%__MODULE__{stages: stages}, slug) when is_binary(slug) do
    Enum.find(stages, fn stage -> stage.slug == slug end)
  end

  @spec get_all() :: list(t())
  def get_all do
    Repo.all(__MODULE__)
  end

  @spec get_public() :: list(t())
  def get_public do
    __MODULE__
    |> where([e], e.type == "public")
    |> Repo.all()
  end

  @spec get!(String.t()) :: t() | no_return()
  def get!(id) do
    Repo.get!(__MODULE__, id)
  end

  @spec get(String.t()) :: t() | no_return()
  def get(id) do
    Repo.get(__MODULE__, id)
  end

  @spec get_by_slug!(String.t()) :: t() | no_return()
  def get_by_slug!(slug) do
    Repo.get_by!(__MODULE__, slug: String.downcase(slug))
  end

  @spec get_by_slug(String.t()) :: t() | nil
  def get_by_slug(slug) do
    Repo.get_by(__MODULE__, slug: String.downcase(slug))
  end

  @spec create(map()) :: {:ok, t()} | {:error, term()}
  def create(params) do
    %__MODULE__{}
    |> changeset(params)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, term()}
  def update(event, params) do
    event
    |> changeset(params)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, term()}
  def delete(task) do
    Repo.delete(task)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(clan, attrs \\ %{}) do
    clan
    |> cast(attrs, [:slug, :type, :ticker_text, :title, :description, :creator_id, :starts_at])
    |> cast_embed(:stages, with: &stage_changeset/2)
    |> validate_length(:slug, min: 2, max: 57)
    |> validate_length(:description, min: 3, max: 10_000)
    |> validate_length(:title, min: 3, max: 250)
    |> validate_inclusion(:type, @types)
    |> unique_constraint(:slug)
  end

  def types, do: @types

  def stage_changeset(stage, params \\ %{}) do
    stage
    |> cast(params, [
      :action_button_text,
      :confirmation_text,
      :dates,
      :name,
      :slug,
      :status,
      :tournament_id,
      :tournament_meta,
      :playing_type,
      :type
    ])
    |> validate_required([:slug, :name, :status, :type])
    |> validate_inclusion(:status, [:pending, :passed, :active])
    |> validate_inclusion(:type, [:tournament, :entrance])
    |> validate_inclusion(:playing_type, [:single, :global])
  end
end
