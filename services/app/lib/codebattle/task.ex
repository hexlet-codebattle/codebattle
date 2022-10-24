defmodule Codebattle.Task do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :name,
             :level,
             :examples,
             :description_ru,
             :description_en,
             :tags,
             :state,
             :origin,
             :visibility,
             :creator_id
           ]}

  @levels ~w(elementary easy medium hard)
  @states ~w(draft on_moderation active disabled)
  @origin_types ~w(github user)
  @visibility_types ~w(hidden public)

  schema "tasks" do
    field(:examples, :string)
    field(:description_ru, :string)
    field(:description_en, :string)
    field(:name, :string)
    field(:level, :string)
    field(:input_signature, {:array, AtomizedMap}, default: [])
    field(:output_signature, AtomizedMap, default: %{})
    field(:asserts, {:array, AtomizedMap}, default: [])
    field(:disabled, :boolean)
    field(:count, :integer, virtual: true)
    field(:tags, {:array, :string}, default: [])
    field(:state, :string)
    field(:visibility, :string, default: "public")
    field(:origin, :string)
    field(:creator_id, :integer)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :examples,
      :asserts,
      :description_ru,
      :description_en,
      :name,
      :level,
      :input_signature,
      :output_signature,
      :disabled,
      :tags,
      :state,
      :origin,
      :visibility,
      :creator_id
    ])
    |> validate_required([:examples, :description_en, :name, :level, :asserts])
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:level, @levels)
    |> validate_inclusion(:origin, @origin_types)
    |> validate_inclusion(:visibility, @visibility_types)
    |> unique_constraint(:name)
  end

  def upsert!(params) do
    %__MODULE__{}
    |> changeset(params)
    |> Codebattle.Repo.insert!(
      on_conflict: [
        set: [
          creator_id: params[:creator_id],
          origin: params.origin,
          state: params.state,
          visibility: params.visibility,
          examples: params.examples,
          description_en: params.description_en,
          description_ru: params.description_ru,
          level: params.level,
          input_signature: params.input_signature,
          output_signature: params.output_signature,
          asserts: params.asserts,
          tags: params.tags
        ]
      ],
      conflict_target: :name
    )
  end

  def public(query) do
    from(t in query, where: t.visibility == "public")
  end

  def visible(query) do
    from(t in query, where: t.visibility == "public" and t.state == "active")
  end

  def list_visible(user) do
    __MODULE__
    |> filter_visibility(user)
    |> order_by([{:desc, :origin}, :state, :level, :name])
    |> Repo.all()
  end

  def filter_visibility(query, user) do
    if Codebattle.User.is_admin?(user) do
      Function.identity(query)
    else
      from(t in query,
        where: [visibility: "public", state: "active"],
        or_where: [creator_id: ^user.id]
      )
    end
  end

  def get_task_by_id_for_user(user, task_id) do
    __MODULE__
    |> filter_visibility(user)
    |> where([t], t.id == ^task_id)
    |> Repo.one()
  end

  def list_all_tags do
    query = """
    SELECT distinct unnest(tags) from tasks
    where visibility = 'public'
    and state = 'active'
    """

    Repo
    |> Ecto.Adapters.SQL.query!(query)
    |> Map.get(:rows)
    |> List.flatten()
  end

  def get!(id), do: Repo.get!(__MODULE__, id)
  def get(id), do: Repo.get(__MODULE__, id)

  def get_shuffled_task_ids(level) do
    from(task in Codebattle.Task, where: task.level == ^level)
    |> visible()
    |> select([x], x.id)
    |> Repo.all()
    |> Enum.shuffle()
  end

  def get_played_count(task_id) do
    from(game in Codebattle.Game, where: game.task_id == ^task_id)
    |> Repo.count()
  end

  def can_see_task?(%{visibility: "public"}, _user), do: true

  def can_see_task?(task, user), do: can_access_task?(task, user)

  def can_access_task?(task, user) do
    task.creator_id == user.id || Codebattle.User.is_admin?(user)
  end

  def change_state(task, state) do
    task
    |> changeset(%{state: state})
    |> Repo.update!()
  end

  def levels, do: @levels
  def visibility_types, do: @visibility_types
  def origin_types, do: @origin_types
  def states, do: @states
end
