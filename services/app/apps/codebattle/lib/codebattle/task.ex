defmodule Codebattle.Task do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User
  alias Runner.AtomizedMap

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
             :creator_id,
             :input_signature,
             :output_signature,
             :asserts,
             :asserts_examples,
             :solution,
             :arguments_generator,
             :generator_lang
           ]}

  @level_order %{
    "elementary" => 0,
    "easy" => 1,
    "medium" => 2,
    "hard" => 3
  }

  @state_order %{
    "blank" => 0,
    "draft" => 1,
    "on_moderation" => 2,
    "active" => 3,
    "disabled" => 4
  }
  @origin_order %{
    "user" => 0,
    "github" => 1
  }

  @levels ~w(elementary easy medium hard)
  @states ~w(blank draft on_moderation active disabled)
  @origin_types ~w(github user)
  @visibility_types ~w(hidden public)

  schema "tasks" do
    field(:description_ru, :string)
    field(:description_en, :string)
    field(:name, :string)
    field(:level, :string)
    field(:input_signature, {:array, AtomizedMap}, default: [])
    field(:output_signature, AtomizedMap, default: %{})
    field(:asserts_examples, {:array, AtomizedMap}, default: [])
    field(:asserts, {:array, AtomizedMap}, default: [])
    field(:examples, :string)
    field(:disabled, :boolean)
    field(:count, :integer, virtual: true)
    field(:tags, {:array, :string}, default: [])
    field(:state, :string)
    field(:visibility, :string, default: "public")
    field(:origin, :string)
    field(:creator_id, :integer)
    field(:solution, :string, default: "")
    field(:arguments_generator, :string, default: "")
    field(:generator_lang, :string, default: "js")

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
      :creator_id,
      :solution,
      :arguments_generator,
      :generator_lang
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
          asserts_examples: Map.get(params, :asserts_examples, []),
          solution: Map.get(params, :solution, ""),
          arguments_generator: Map.get(params, :arguments_generator, ""),
          generator_lang: Map.get(params, :generator_lang, "js"),
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

  @spec list_visible(User.t()) :: list() | list(t())
  def list_visible(user) do
    __MODULE__
    |> filter_visibility(user)
    |> Repo.all()
    |> Enum.sort_by(
      &{@origin_order[&1.origin], @state_order[&1.state], @level_order[&1.level], &1.name}
    )
  end

  defp filter_visibility(query, user) do
    if Codebattle.User.admin?(user) do
      Function.identity(query)
    else
      from(t in query,
        where: [visibility: "public", state: "active"],
        or_where: [creator_id: ^user.id]
      )
    end
  end

  @spec get_by_ids(list(pos_integer())) :: list(t())
  def get_by_ids(task_ids) do
    __MODULE__
    |> where([t], t.id in ^task_ids)
    |> Repo.all()
  end

  @spec get_task_by_id_for_user(User.t(), term()) :: t() | nil
  def get_task_by_id_for_user(user, task_id) do
    __MODULE__
    |> filter_visibility(user)
    |> where([t], t.id == ^task_id)
    |> Repo.one()
  end

  @spec uniq?(String.t()) :: boolean()
  def uniq?(task_name) do
    result =
      __MODULE__
      |> where([t], t.name == ^task_name)
      |> Repo.exists?()

    !result
  end

  @spec get_task_by_tags_for_user(User.t(), list(String.t())) :: t() | nil
  def get_task_by_tags_for_user(user, tags) do
    __MODULE__
    |> filter_visibility(user)
    |> where([t], fragment("? @> ?", t.tags, ^tags))
    |> order_by(fragment("RANDOM()"))
    |> limit(1)
    |> Repo.one()
  end

  @spec list_all_tags() :: list(String.t())
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

  @spec list_task_ids() :: list(integer())
  def list_task_ids() do
    from(task in Codebattle.Task)
    |> visible()
    |> select([x], x.id)
    |> Repo.all()
  end

  def get!(id), do: Repo.get!(__MODULE__, id)
  def get(id), do: Repo.get(__MODULE__, id)

  def create_empty(creator_id),
    do: %Codebattle.Task{
      examples: "",
      name: "",
      description_ru: "",
      description_en: "",
      level: "elementary",
      input_signature: [],
      output_signature: %{
        type: %{name: "integer"}
      },
      asserts: [],
      asserts_examples: [],
      tags: [],
      state: "blank",
      visibility: "public",
      origin: "user",
      creator_id: creator_id,
      solution: "",
      arguments_generator: "",
      generator_lang: "js"
    }

  @spec get_shuffled_task_ids(String.t()) :: list(integer())
  def get_shuffled_task_ids(level) do
    from(task in Codebattle.Task, where: task.level == ^level)
    |> visible()
    |> select([x], x.id)
    |> Repo.all()
    |> Enum.shuffle()
  end

  @spec get_tasks_by_level(String.t()) :: list(t())
  def get_tasks_by_level(level) do
    from(task in Codebattle.Task, where: task.level == ^level)
    |> visible()
    |> Repo.all()
  end

  @spec get_all_visible() :: list(t())
  def get_all_visible() do
    from(task in Codebattle.Task)
    |> visible()
    |> Repo.all()
  end

  @spec get_played_count(integer()) :: integer()
  def get_played_count(task_id) do
    from(game in Codebattle.Game, where: game.task_id == ^task_id)
    |> Repo.count()
  end

  @spec can_see_task?(t(), User.t()) :: boolean()
  def can_see_task?(%{visibility: "public"}, _user), do: true
  def can_see_task?(task, user), do: can_access_task?(task, user)

  @spec can_access_task?(Codebattle.Task.t(), User.t()) :: boolean()
  def can_access_task?(task, user) do
    task.creator_id == user.id || Codebattle.User.admin?(user)
  end

  @spec can_delete_task?(Codebattle.Task.t(), User.t()) :: boolean()
  def can_delete_task?(task, user) do
    (task.creator_id == user.id || Codebattle.User.admin?(user)) && task.origin == "user"
  end

  def change_state(task, state) do
    task
    |> changeset(%{state: state})
    |> Repo.update!()
  end

  @spec get_task_by_level(String.t()) :: t()
  def get_task_by_level(level), do: tasks_provider().get_task(level)

  def delete(task) do
    Repo.delete(task)
  end

  defp tasks_provider do
    Application.get_env(:codebattle, :tasks_provider)
  end

  def levels, do: @levels
  def visibility_types, do: @visibility_types
  def origin_types, do: @origin_types
  def states, do: @states
end
