defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.Event
  alias Codebattle.Tournament.Swiss
  alias Runner.AtomizedMap

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :access_token,
             :access_type,
             :break_duration_seconds,
             :break_state,
             :creator_id,
             :current_round_id,
             :current_round_position,
             :description,
             :event_id,
             :grade,
             :id,
             :is_live,
             :last_round_ended_at,
             :last_round_started_at,
             :match_timeout_seconds,
             :matches,
             :meta,
             :name,
             :players,
             :players_count,
             :players_limit,
             :ranking_type,
             :round_timeout_seconds,
             :rounds_limit,
             :score_strategy,
             :started_at,
             :starts_at,
             :state,
             :stats,
             :task_pack_name,
             :task_provider,
             :task_strategy,
             :tournament_timeout_seconds,
             :type,
             :use_chat,
             :use_clan,
             :use_event_ranking,
             :use_infinite_break,
             :use_timer
           ]}

  @access_types ~w(public token)
  @break_states ~w(on off)
  @grades ~w(open rookie challenger pro elite masters grand_slam)
  @levels ~w(elementary easy medium hard)
  @public_types ~w(swiss)
  @ranking_types ~w(by_clan by_user)
  @score_strategies ~w(75_percentile win_loss)
  @states ~w(upcoming waiting_participants canceled active timeout finished)
  @task_providers ~w(level task_pack all)
  @task_strategies ~w(random sequential)
  @types ~w(swiss)

  @default_match_timeout Application.compile_env(:codebattle, :tournament_match_timeout)

  schema "tournaments" do
    belongs_to(:creator, Codebattle.User, on_replace: :update)
    belongs_to(:event, Event, on_replace: :update)

    field(:access_token, :string)
    field(:access_type, :string, default: "public")
    field(:break_duration_seconds, :integer, default: 42)
    field(:break_state, :string, default: "off")
    field(:current_round_id, :integer)
    field(:current_round_position, :integer, default: 0)
    field(:description, :string)
    field(:finished_at, :utc_datetime)
    field(:grade, :string, default: "open")
    field(:labels, {:array, :string})
    field(:last_round_ended_at, :naive_datetime)
    field(:last_round_started_at, :naive_datetime)
    field(:level, :string, default: "easy")
    field(:match_timeout_seconds, :integer, default: @default_match_timeout)
    field(:matches, AtomizedMap, default: %{})
    field(:meta, AtomizedMap, default: %{})
    field(:name, :string)
    field(:players, AtomizedMap, default: %{})
    field(:players_limit, :integer)
    field(:ranking_type, :string, default: "by_user")
    field(:round_timeout_seconds, :integer)
    field(:rounds_limit, :integer, default: 1)
    field(:score_strategy, :string, default: "75_percentile")
    field(:show_results, :boolean, default: true)
    field(:started_at, :utc_datetime)
    field(:starts_at, :utc_datetime)
    field(:state, :string, default: "waiting_participants")
    field(:stats, AtomizedMap, default: %{})
    field(:task_pack_name, :string)
    field(:task_provider, :string, default: "level")
    field(:task_strategy, :string, default: "random")
    field(:tournament_timeout_seconds, :integer)
    field(:type, :string, default: "swiss")
    field(:use_chat, :boolean, default: true)
    field(:use_clan, :boolean, default: false)
    field(:use_event_ranking, :boolean, default: false)
    field(:use_infinite_break, :boolean, default: false)
    field(:use_timer, :boolean, default: true)
    field(:winner_ids, {:array, :integer})

    # ETS storage
    field(:clans_table, :string, virtual: true)
    field(:matches_table, :string, virtual: true)
    field(:players_table, :string, virtual: true)
    field(:ranking_table, :string, virtual: true)
    field(:tasks_table, :string, virtual: true)

    field(:is_live, :boolean, virtual: true, default: false)
    field(:module, :any, virtual: true, default: Swiss)
    field(:played_pair_ids, EctoMapSet, of: {:array, :integer}, virtual: true, default: [])
    field(:players_count, :integer, virtual: true, default: 0)
    field(:event_ranking, :map, virtual: true, default: %{})
    field(:task_ids, {:array, :integer}, virtual: true, default: [])

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :access_token,
      :access_type,
      :break_duration_seconds,
      :break_state,
      :current_round_id,
      :current_round_position,
      :description,
      :event_id,
      :grade,
      :last_round_ended_at,
      :last_round_started_at,
      :level,
      :match_timeout_seconds,
      :matches,
      :meta,
      :name,
      :played_pair_ids,
      :players,
      :players_count,
      :players_limit,
      :ranking_type,
      :round_timeout_seconds,
      :rounds_limit,
      :score_strategy,
      :show_results,
      :started_at,
      :starts_at,
      :state,
      :task_ids,
      :task_pack_name,
      :task_provider,
      :task_strategy,
      :tournament_timeout_seconds,
      :type,
      :use_chat,
      :use_clan,
      :use_event_ranking,
      :use_infinite_break,
      :use_timer
    ])
    |> validate_inclusion(:access_type, @access_types)
    |> validate_inclusion(:break_state, @break_states)
    |> validate_inclusion(:grade, @grades)
    |> validate_inclusion(:level, @levels)
    |> validate_inclusion(:ranking_type, @ranking_types)
    |> validate_inclusion(:score_strategy, @score_strategies)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:task_provider, @task_providers)
    |> validate_inclusion(:task_strategy, @task_strategies)
    |> validate_inclusion(:type, @types)
    |> validate_number(:match_timeout_seconds, greater_than_or_equal_to: 1)
    |> validate_required([:name, :starts_at])
    |> validate_event_id(params["event_id"] || params[:event_id])
    |> add_creator(params["creator"] || params[:creator])
  end

  defp validate_event_id(changeset, nil), do: changeset
  defp validate_event_id(changeset, ""), do: changeset

  defp validate_event_id(changeset, event_id) do
    case Event.get(event_id) do
      nil -> add_error(changeset, :event_id, "Event not found")
      _ -> change(changeset, %{event_id: event_id})
    end
  end

  defp add_creator(changeset, nil), do: changeset

  defp add_creator(changeset, creator) do
    change(changeset, %{creator: creator})
  end

  def access_types, do: @access_types
  def grades, do: @grades
  def public_types, do: @public_types
  def ranking_types, do: @ranking_types
  def score_strategies, do: @score_strategies
  def task_providers, do: @task_providers
  def task_strategies, do: @task_strategies
  def types, do: @types
end
