defmodule Codebattle.Task do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Runner.AtomizedMap
  alias Codebattle.User

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :arguments_generator,
             :asserts,
             :asserts_examples,
             :base_score,
             :comment,
             :creator_id,
             :description_en,
             :description_ru,
             :description_es,
             :description_zh,
             :examples,
             :examples_list,
             :generator_lang,
             :id,
             :input_signature,
             :level,
             :name,
             :origin,
             :output_signature,
             :state,
             :tags,
             :time_to_solve_sec,
             :type,
             :visibility
           ]}

  @level_order %{
    "elementary" => 0,
    "easy" => 1,
    "medium" => 2,
    "hard" => 3
  }

  # Default timing per level, used when a task doesn't set its own: `base_score` is the
  # task's points (and, in a ladder, the seconds between rounds), `time_to_solve_sec` is
  # the game time limit. Harder tasks take longer and are worth more.
  @level_timing %{
    "elementary" => %{base_score: 60, time_to_solve_sec: 120},
    "easy" => %{base_score: 90, time_to_solve_sec: 180},
    "medium" => %{base_score: 150, time_to_solve_sec: 300},
    "hard" => %{base_score: 240, time_to_solve_sec: 480}
  }
  @default_timing %{base_score: 60, time_to_solve_sec: 180}

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

  @task_type "algorithms"
  @levels ~w(elementary easy medium hard)
  @states ~w(blank draft on_moderation active disabled)
  @origin_types ~w(github user)
  @visibility_types ~w(hidden public)

  schema "tasks" do
    field(:description_ru, :string)
    field(:description_en, :string)
    field(:description_es, :string)
    field(:description_zh, :string)
    field(:type, :string, default: @task_type)
    field(:name, :string)
    field(:level, :string)
    field(:comment, :string)
    field(:input_signature, {:array, AtomizedMap}, default: [])
    field(:output_signature, AtomizedMap, default: %{})
    field(:asserts_examples, {:array, AtomizedMap}, default: [])
    field(:asserts, {:array, AtomizedMap}, default: [])
    field(:examples, :string)
    field(:examples_list, {:array, :string}, default: [])
    field(:disabled, :boolean)
    field(:count, :integer, virtual: true)
    field(:tags, {:array, :string}, default: [])
    field(:state, :string)
    field(:visibility, :string, default: "public")
    field(:origin, :string)
    field(:creator_id, :integer)
    field(:solution, :string, default: "")
    field(:solutions, :map, default: %{})
    field(:arguments_generator, :string, default: "")
    field(:generator_lang, :string, default: "js")
    field(:time_to_solve_sec, :integer, default: 180)
    field(:base_score, :integer, default: 60)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :arguments_generator,
      :asserts,
      :base_score,
      :comment,
      :creator_id,
      :description_en,
      :description_ru,
      :description_es,
      :description_zh,
      :disabled,
      :examples,
      :examples_list,
      :generator_lang,
      :input_signature,
      :level,
      :name,
      :origin,
      :output_signature,
      :solution,
      :solutions,
      :state,
      :tags,
      :time_to_solve_sec,
      :type,
      :visibility
    ])
    |> put_level_timing(params)
    |> validate_required([:examples, :description_en, :name, :level, :asserts, :base_score])
    |> validate_number(:base_score, greater_than: 0)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:level, @levels)
    |> validate_inclusion(:origin, @origin_types)
    |> validate_inclusion(:visibility, @visibility_types)
    |> unique_constraint(:name)
  end

  def level_timing(level), do: Map.get(@level_timing, level, @default_timing)

  # A new task that doesn't set its timing gets its level's defaults. Existing tasks keep
  # theirs: an edit without these fields must not reset them.
  defp put_level_timing(%Ecto.Changeset{data: %{__meta__: %{state: :built}}} = changeset, params) do
    timing = level_timing(get_field(changeset, :level))

    Enum.reduce(timing, changeset, fn {field, value}, changeset ->
      if param_given?(params, field), do: changeset, else: put_change(changeset, field, value)
    end)
  end

  defp put_level_timing(changeset, _params), do: changeset

  defp param_given?(params, field) do
    not is_nil(Map.get(params, field) || Map.get(params, Atom.to_string(field)))
  end

  def upsert!(params) do
    %__MODULE__{}
    |> changeset(params)
    |> Repo.insert!(
      on_conflict: [
        set:
          [
            arguments_generator: Map.get(params, :arguments_generator, ""),
            asserts: params.asserts,
            asserts_examples: Map.get(params, :asserts_examples, []),
            base_score: Map.get(params, :base_score) || level_timing(params.level).base_score,
            comment: Map.get(params, :comment),
            creator_id: params[:creator_id],
            description_en: params.description_en,
            description_ru: Map.get(params, :description_ru, ""),
            examples: params.examples,
            generator_lang: Map.get(params, :generator_lang, "js"),
            input_signature: params.input_signature,
            level: params.level,
            time_to_solve_sec: Map.get(params, :time_to_solve_sec) || level_timing(params.level).time_to_solve_sec,
            origin: params.origin,
            output_signature: params.output_signature,
            solution: Map.get(params, :solution, ""),
            solutions: Map.get(params, :solutions, %{}),
            state: params.state,
            tags: Map.get(params, :tags, []),
            examples_list: Map.get(params, :examples_list, []),
            updated_at: DateTime.utc_now(),
            visibility: params.visibility
          ] ++ Map.to_list(Map.take(params, [:description_es, :description_zh]))
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

  def active(query) do
    from(t in query, where: t.state == "active")
  end

  @spec list_visible(User.t()) :: list() | list(t())
  def list_visible(user) do
    __MODULE__
    |> filter_visibility(user)
    |> Repo.all()
    |> Enum.sort_by(
      &{
        @origin_order[&1.origin],
        @state_order[&1.state],
        @level_order[&1.level],
        &1.name
      }
    )
  end

  defp filter_visibility(query, user) do
    if User.admin?(user) do
      Function.identity(query)
    else
      from(t in query,
        where: [visibility: "public", state: "active"],
        or_where: [creator_id: ^user.id]
      )
    end
  end

  @spec get_by_names(list(String.t())) :: list(t())
  def get_by_names(names) do
    __MODULE__
    |> where([t], t.name in ^names)
    |> Repo.all()
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

  @spec get_task_by_name_for_user(User.t(), String.t()) :: t() | nil
  def get_task_by_name_for_user(user, name) do
    __MODULE__
    |> filter_visibility(user)
    |> where([t], t.name == ^name)
    |> Repo.one()
  end

  @doc """
  Tasks the user may play, narrowed by `:level`, `:tags` (any of them) and `:name`
  (case-insensitive substring), ordered by level and name.
  """
  @spec search_for_user(User.t(), keyword()) :: list(t())
  def search_for_user(user, filters) do
    query = filter_visibility(__MODULE__, user)

    filters
    |> Enum.reduce(query, fn
      {:level, level}, query when is_binary(level) ->
        where(query, [t], t.level == ^level)

      {:tags, [_ | _] = tags}, query ->
        where(query, [t], fragment("? && ?", t.tags, ^tags))

      {:name, name}, query when is_binary(name) and name != "" ->
        where(query, [t], ilike(t.name, ^"%#{escape_like(name)}%"))

      _filter, query ->
        query
    end)
    |> Repo.all()
    |> Enum.sort_by(&{@level_order[&1.level], &1.name})
  end

  defp escape_like(value), do: String.replace(value, ["\\", "%", "_"], &("\\" <> &1))

  @spec uniq?(String.t()) :: boolean()
  def uniq?(task_name) do
    result =
      __MODULE__
      |> where([t], t.name == ^task_name)
      |> Repo.exists?()

    !result
  end

  @spec get_task_by_tags_for_user(User.t(), list(String.t()), String.t() | nil) :: t() | nil
  def get_task_by_tags_for_user(user, tags, level \\ nil) do
    query =
      __MODULE__
      |> filter_visibility(user)
      # Match a task carrying ANY of the selected tags (array overlap), mirroring
      # the union the task-picker UI shows. `@>` (contains-all) never matched
      # multi-tag selections — especially the synthetic "rest" bucket tag, which
      # no task carries — so the filter was silently dropped and a random task
      # of the level was created instead.
      |> where([t], fragment("? && ?", t.tags, ^tags))

    query =
      if level do
        where(query, [t], t.level == ^level)
      else
        query
      end

    query
    |> order_by(fragment("RANDOM()"))
    |> limit(1)
    |> Repo.one()
  end

  @spec get_random_training_task() :: t() | nil
  def get_random_training_task do
    __MODULE__
    |> active()
    |> where([t], fragment("? @> ?::varchar[]", t.tags, ["training"]))
    |> order_by(fragment("RANDOM()"))
    |> limit(1)
    |> Repo.one()
  end

  @doc "Prefers public beginner training tasks, falling back to other beginner tasks and avoiding repeats."
  @spec get_onboarding_task(integer() | nil) :: t() | nil
  def get_onboarding_task(previous_task_id \\ nil) do
    query =
      __MODULE__
      |> active()
      |> where([t], t.visibility == "public" and t.level in ["elementary", "easy"])
      |> order_by([t],
        desc: fragment("? @> ?::varchar[]", t.tags, ["training"]),
        asc: fragment("CASE WHEN ? = 'elementary' THEN 0 ELSE 1 END", t.level),
        asc: t.id
      )
      |> limit(1)

    if is_integer(previous_task_id) do
      Repo.one(where(query, [t], t.id != ^previous_task_id)) || Repo.one(query)
    else
      Repo.one(query)
    end
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
  def list_task_ids do
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
      comment: "",
      level: "elementary",
      input_signature: [],
      output_signature: %{type: %{name: "integer"}},
      asserts: [],
      asserts_examples: [],
      tags: [],
      state: "blank",
      visibility: "public",
      origin: "user",
      creator_id: creator_id,
      solution: "",
      solutions: %{},
      examples_list: [],
      arguments_generator: "",
      generator_lang: "js",
      base_score: @level_timing["elementary"].base_score,
      time_to_solve_sec: @level_timing["elementary"].time_to_solve_sec
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
  def get_all_visible do
    from(task in Codebattle.Task)
    |> visible()
    |> Repo.all()
  end

  @spec get_played_count(integer()) :: integer()
  def get_played_count(task_id) do
    Repo.count(from(game in Codebattle.Game, where: game.task_id == ^task_id))
  end

  @spec can_see_task?(t(), User.t()) :: boolean()
  def can_see_task?(%{visibility: "public"}, _user), do: true
  def can_see_task?(task, user), do: can_access_task?(task, user)

  @spec can_access_task?(Codebattle.Task.t(), User.t()) :: boolean()
  def can_access_task?(task, user) do
    task.creator_id == user.id || User.admin?(user)
  end

  @spec can_delete_task?(Codebattle.Task.t(), User.t()) :: boolean()
  def can_delete_task?(task, user) do
    (task.creator_id == user.id || User.admin?(user)) && task.origin == "user"
  end

  def update(task, params) do
    task
    |> changeset(params)
    |> Repo.update()
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
