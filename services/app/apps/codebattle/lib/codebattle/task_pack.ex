defmodule Codebattle.TaskPack do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Task

  @states ~w(draft on_moderation active disabled)
  @visibility_types ~w(hidden public)

  @derive {Jason.Encoder,
           only: [
             :id,
             :name,
             :state,
             :visibility,
             :task_ids,
             :creator_id
           ]}

  schema "task_packs" do
    field(:name, :string)
    field(:state, :string)
    field(:visibility, :string)
    field(:task_ids, {:array, :integer}, default: [])
    field(:creator_id, :integer)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :name,
      :task_ids,
      :state,
      :visibility,
      :creator_id
    ])
    |> validate_required([:name, :task_ids, :state, :visibility, :creator_id])
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:visibility, @visibility_types)
    |> unique_constraint(:name)
  end

  def get!(id), do: Repo.get!(__MODULE__, id)
  def get(id), do: Repo.get(__MODULE__, id)
  def get_by!(params), do: Repo.get_by!(__MODULE__, params)
  def get_by(params), do: Repo.get_by(__MODULE__, params)

  def get_tasks(task_pack = %__MODULE__{}) do
    query = from(t in Task, where: t.id in ^task_pack.task_ids)
    Repo.all(query)
  end

  def can_see_task_pack?(%{visibility: "public"}, _user), do: true

  def can_see_task_pack?(task_pack, user), do: can_access_task_pack?(task_pack, user)

  def can_access_task_pack?(task_pack, user) do
    task_pack.creator_id == user.id || Codebattle.User.admin?(user)
  end

  @spec get_tasks_by_pack_id(pos_integer()) :: [Codebattle.Task.t()]
  def get_tasks_by_pack_id(task_pack_id) do
    task_pack_id
    |> get()
    |> case do
      nil ->
        []

      task_pack ->
        tasks = Codebattle.Task.get_by_ids(task_pack.task_ids)

        task_pack.task_ids
        |> Enum.map(fn task_id -> Enum.find(tasks, fn task -> task.id == task_id end) end)
    end
  end

  @spec get_tasks_by_pack_name(String.t()) :: [Codebattle.Task.t()]
  def get_tasks_by_pack_name(name) do
    Codebattle.TaskPack
    |> Repo.get_by(name: name)
    |> case do
      nil ->
        []

      task_pack ->
        tasks = Codebattle.Task.get_by_ids(task_pack.task_ids)

        task_pack.task_ids
        |> Enum.map(fn task_id -> Enum.find(tasks, fn task -> task.id == task_id end) end)
    end
  end

  def list_visible(user) do
    __MODULE__
    |> filter_visibility(user)
    |> order_by([:state, :name])
    |> Repo.all()
  end

  def filter_visibility(query, user) do
    if Codebattle.User.admin?(user) do
      Function.identity(query)
    else
      from(t in query,
        where: [visibility: "public", state: "active"],
        or_where: [creator_id: ^user.id]
      )
    end
  end

  def change_state(task_pack, state) do
    task_pack
    |> changeset(%{state: state})
    |> Repo.update!()
  end

  def states, do: @states
  def visibility_types, do: @visibility_types

  def delete(task_pack) do
    Repo.delete(task_pack)
  end
end
