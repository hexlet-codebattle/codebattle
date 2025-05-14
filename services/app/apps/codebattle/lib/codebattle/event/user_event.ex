defmodule Codebattle.UserEvent do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :user_id,
             :event_id,
             :stages,
             :state
           ]}

  schema "user_events" do
    belongs_to(:user, Codebattle.User)
    belongs_to(:event, Codebattle.Event)

    embeds_one(:state, __MODULE__.State)

    embeds_many(:stages, Codebattle.UserEvent.Stage, on_replace: :delete, primary_key: false) do
      @derive {Jason.Encoder,
               only: [
                 :slug,
                 :status,
                 :tournament_id,
                 :entrance_result,
                 :place_in_total_rank,
                 :place_in_category_rank,
                 :games_count,
                 :score,
                 :time_spent_in_seconds,
                 :wins_count,
                 :finished_at,
                 :started_at
               ]}

      field(:slug, :string)
      field(:status, Ecto.Enum, values: [:pending, :started, :completed, :failed])

      field(:tournament_id, :integer)
      field(:entrance_result, Ecto.Enum, values: [:passed, :not_passed])

      field(:place_in_total_rank, :integer)
      field(:place_in_category_rank, :integer)

      field(:games_count, :integer)
      field(:score, :integer)
      field(:time_spent_in_seconds, :integer)
      field(:wins_count, :integer)

      field(:finished_at, :utc_datetime)
      field(:started_at, :utc_datetime)
    end

    timestamps()
  end

  @spec get_stage(t(), String.t()) :: __MODULE__.Stage.t() | nil
  def get_stage(%{stages: stages}, slug) when is_list(stages) do
    Enum.find(stages, fn stage -> stage.slug == slug end)
  end

  def get_stage(_user_event, _slug), do: nil

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

  @spec mark_stage_as_started(t(), String.t(), integer()) :: t()
  def mark_stage_as_started(user_event, stage_slug, tournament_id) do
    stages =
      user_event.stages
      |> Enum.map(fn stage ->
        if stage.slug == stage_slug do
          %{
            stage
            | status: :started,
              started_at: DateTime.utc_now(),
              tournament_id: tournament_id
          }
        else
          stage
        end
      end)
      |> Enum.map(&Map.from_struct/1)

    user_event
    |> changeset(%{stages: stages})
    |> Repo.update!()
  end

  def mark_stage_as_completed(event_id, user_id, tournament_info) do
    user_event = Repo.one(from(ue in __MODULE__, where: ue.event_id == ^event_id and ue.user_id == ^user_id, limit: 1))

    if user_event do
      stages =
        user_event.stages
        |> Enum.map(fn stage ->
          if stage.tournament_id == tournament_info.id do
            %{
              stage
              | status: :completed,
                games_count: tournament_info.games_count,
                wins_count: tournament_info.wins_count,
                time_spent_in_seconds: tournament_info.time_spent_in_seconds,
                finished_at: DateTime.utc_now()
            }
          else
            stage
          end
        end)
        |> Enum.map(&Map.from_struct/1)

      user_event
      |> changeset(%{stages: stages})
      |> Repo.update!()
    end
  end

  @spec upsert_stages(t(), list(map())) :: {:ok, t()} | {:error, term()}
  def upsert_stages(user_event, stages_params) do
    # Update the user_event with the new stages directly
    user_event
    |> changeset(%{stages: stages_params})
    |> Repo.update()
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(user_event, attrs \\ %{}) do
    user_event
    |> cast(attrs, [:user_id, :event_id])
    |> cast_embed(:state)
    |> cast_embed(:stages, with: &stage_changeset/2)
  end

  defp stage_changeset(stage, attrs) do
    stage
    |> cast(attrs, [
      :place_in_total_rank,
      :finished_at,
      :games_count,
      :entrance_result,
      :place_in_category_rank,
      :score,
      :slug,
      :started_at,
      :status,
      :time_spent_in_seconds,
      :tournament_id,
      :wins_count
    ])
    |> validate_required([:slug])
  end
end
