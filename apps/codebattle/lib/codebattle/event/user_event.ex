defmodule Codebattle.UserEvent do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.UserEvent.Stage

  @statuses ~w(pending in_progress completed failed)

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :user_id,
             :event_id,
             :status,
             :current_stage_slug,
             :started_at,
             :finished_at,
             :stages
           ]}

  schema "user_events" do
    belongs_to(:user, Codebattle.User)
    belongs_to(:event, Codebattle.Event)
    has_many(:stages, Stage, on_replace: :delete)

    field(:status, :string, default: "pending")
    field(:current_stage_slug, :string)
    field(:started_at, :utc_datetime)
    field(:finished_at, :utc_datetime)

    timestamps()
  end

  @spec statuses() :: list(String.t())
  def statuses, do: @statuses

  @spec get_stage(t(), String.t()) :: map() | nil
  def get_stage(%{stages: stages}, slug) when is_list(stages) do
    Enum.find(stages, fn stage -> stage.slug == slug end)
  end

  def get_stage(_user_event, _slug), do: nil

  @spec get_all() :: list(t())
  def get_all do
    __MODULE__
    |> preload(:stages)
    |> Repo.all()
  end

  @spec get_by_user_id_and_event_id(integer() | String.t(), integer() | String.t()) :: t() | nil
  def get_by_user_id_and_event_id(user_id, event_id) do
    __MODULE__
    |> where([ue], ue.user_id == ^user_id and ue.event_id == ^event_id)
    |> preload(:stages)
    |> Repo.one()
  end

  @spec get!(String.t()) :: t() | no_return()
  def get!(id) do
    __MODULE__
    |> Repo.get!(id)
    |> Repo.preload(:stages)
  end

  @spec get(String.t()) :: t() | nil
  def get(id) do
    case Repo.get(__MODULE__, id) do
      nil -> nil
      user_event -> Repo.preload(user_event, :stages)
    end
  end

  @spec create(map()) :: {:ok, t()} | {:error, term()}
  def create(params) do
    %__MODULE__{}
    |> changeset(params)
    |> Repo.insert()
    |> preload_stages()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, term()}
  def update(user_event, params) do
    user_event
    |> changeset(params)
    |> Repo.update()
    |> preload_stages()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, term()}
  def delete(user_event) do
    Repo.delete(user_event)
  end

  @spec mark_stage_as_started(t(), String.t(), integer()) :: t()
  def mark_stage_as_started(user_event, stage_slug, tournament_id) do
    user_event = Repo.preload(user_event, :stages)

    stage_params =
      Enum.map(user_event.stages, fn stage ->
        if stage.slug == stage_slug do
          %{
            id: stage.id,
            slug: stage.slug,
            status: :started,
            started_at: DateTime.utc_now(),
            tournament_id: tournament_id,
            entrance_result: stage.entrance_result,
            place_in_total_rank: stage.place_in_total_rank,
            place_in_category_rank: stage.place_in_category_rank,
            games_count: stage.games_count,
            score: stage.score,
            time_spent_in_seconds: stage.time_spent_in_seconds,
            wins_count: stage.wins_count,
            finished_at: stage.finished_at
          }
        else
          Map.from_struct(stage)
        end
      end)

    {:ok, user_event} =
      __MODULE__.update(user_event, %{
        status: "in_progress",
        current_stage_slug: stage_slug,
        started_at: user_event.started_at || DateTime.utc_now(),
        stages: stage_params
      })

    user_event
  end

  def mark_stage_as_completed(event_id, user_id, tournament_info) do
    with %__MODULE__{} = user_event <- get_by_user_id_and_event_id(user_id, event_id),
         %{} = stage <- Enum.find(user_event.stages, &(&1.tournament_id == tournament_info.id)) do
      stage_params =
        Enum.map(user_event.stages, fn user_stage ->
          if user_stage.id == stage.id do
            %{
              id: user_stage.id,
              slug: user_stage.slug,
              status: :completed,
              tournament_id: user_stage.tournament_id,
              entrance_result: user_stage.entrance_result,
              place_in_total_rank: user_stage.place_in_total_rank,
              place_in_category_rank: user_stage.place_in_category_rank,
              games_count: tournament_info.games_count,
              score: tournament_info[:score],
              time_spent_in_seconds: tournament_info.time_spent_in_seconds,
              wins_count: tournament_info.wins_count,
              started_at: user_stage.started_at,
              finished_at: DateTime.utc_now()
            }
          else
            Map.from_struct(user_stage)
          end
        end)

      completed? = Enum.all?(stage_params, &(to_string(&1.status) == "completed"))

      __MODULE__.update(user_event, %{
        status: if(completed?, do: "completed", else: "in_progress"),
        finished_at: if(completed?, do: DateTime.utc_now()),
        stages: stage_params
      })
    end
  end

  @spec upsert_stages(t(), list(map())) :: {:ok, t()} | {:error, term()}
  def upsert_stages(user_event, stages_params) do
    attrs =
      stages_params
      |> build_status_attrs()
      |> Map.put(:stages, stages_params)

    user_event
    |> Repo.preload(:stages)
    |> __MODULE__.update(attrs)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(user_event, attrs \\ %{}) do
    user_event
    |> cast(attrs, [:user_id, :event_id, :status, :current_stage_slug, :started_at, :finished_at])
    |> validate_required([:user_id, :event_id, :status])
    |> validate_inclusion(:status, @statuses)
    |> cast_assoc(:stages, with: &Stage.changeset/2)
    |> unique_constraint(:event_id, name: :user_events_user_id_event_id_index)
  end

  defp preload_stages({:ok, user_event}), do: {:ok, Repo.preload(user_event, :stages)}
  defp preload_stages(result), do: result

  defp build_status_attrs([]), do: %{status: "pending", current_stage_slug: nil, finished_at: nil}

  defp build_status_attrs(stages_params) do
    current_stage =
      Enum.find(stages_params, fn stage ->
        to_string(Map.get(stage, :status) || Map.get(stage, "status")) == "started"
      end)

    completed? =
      Enum.all?(stages_params, fn stage ->
        to_string(Map.get(stage, :status) || Map.get(stage, "status")) == "completed"
      end)

    %{
      status:
        cond do
          completed? -> "completed"
          current_stage -> "in_progress"
          true -> "pending"
        end,
      current_stage_slug: if(current_stage, do: Map.get(current_stage, :slug) || Map.get(current_stage, "slug")),
      finished_at: nil
    }
  end
end
