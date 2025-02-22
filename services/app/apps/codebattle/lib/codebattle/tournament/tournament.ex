defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.Event
  alias Codebattle.Tournament.Individual
  alias Runner.AtomizedMap

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :access_token,
             :access_type,
             :last_round_ended_at,
             :last_round_started_at,
             :break_duration_seconds,
             :match_timeout_seconds,
             :round_timeout_seconds,
             :break_state,
             :creator_id,
             :event_id,
             :current_round_id,
             :current_round_position,
             :description,
             :id,
             :is_live,
             :level,
             :matches,
             :meta,
             :name,
             :players,
             :players_limit,
             :players_count,
             :score_strategy,
             :starts_at,
             :state,
             :stats,
             :task_pack_name,
             :task_provider,
             :task_strategy,
             :type,
             :use_chat,
             :use_clan,
             :use_event_ranking,
             :use_timer,
             :use_infinite_break
           ]}

  @access_types ~w(public token)
  @break_states ~w(on off)
  @levels ~w(elementary easy medium hard)
  @score_strategies ~w(time_and_tests win_loss one_zero)
  @states ~w(waiting_participants canceled active finished)
  @task_providers ~w(level task_pack task_pack_per_round all)
  @task_strategies ~w(random_per_game random_per_round sequential)
  @ranking_types ~w(void by_player by_clan by_player_95th_percentile)
  @types ~w(individual team show swiss arena versus squad)
  @public_types ~w(individual team swiss arena versus)

  @default_match_timeout Application.compile_env(:codebattle, :tournament_match_timeout)

  schema "tournaments" do
    belongs_to(:creator, Codebattle.User)
    belongs_to(:event, Codebattle.Event)

    field(:access_token, :string)
    field(:access_type, :string, default: "public")
    field(:break_duration_seconds, :integer, default: 42)
    field(:break_state, :string, default: "off")
    field(:current_round_id, :integer)
    field(:current_round_position, :integer, default: 0)
    field(:default_language, :string, default: "js")
    field(:description, :string)
    field(:finished_at, :naive_datetime)
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
    field(:ranking_type, :string, default: "by_player")
    field(:round_timeout_seconds, :integer)
    field(:score_strategy, :string, default: "time_and_tests")
    field(:show_results, :boolean, default: true)
    field(:starts_at, :utc_datetime)
    field(:state, :string, default: "waiting_participants")
    field(:stats, AtomizedMap, default: %{})
    field(:task_pack_name, :string)
    field(:task_provider, :string, default: "level")
    field(:task_strategy, :string, default: "random_per_game")
    field(:type, :string, default: "individual")
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
    field(:module, :any, virtual: true, default: Individual)
    field(:played_pair_ids, EctoMapSet, of: {:array, :integer}, virtual: true, default: [])
    field(:players_count, :integer, virtual: true, default: 0)
    field(:event_ranking, :map, virtual: true, default: %{})
    field(:round_task_ids, {:array, :integer}, virtual: true, default: [])
    field(:round_tasks, :map, virtual: true, default: %{})
    field(:waiting_room_name, :string, virtual: true)
    field(:waiting_room_state, :map, virtual: true, default: %{})

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
      :default_language,
      :description,
      :event_id,
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
      :score_strategy,
      :show_results,
      :starts_at,
      :state,
      :task_pack_name,
      :task_pack_name,
      :task_provider,
      :task_strategy,
      :type,
      :use_chat,
      :use_clan,
      :use_event_ranking,
      :use_infinite_break,
      :use_timer,
      :waiting_room_name
    ])
    |> validate_inclusion(:access_type, @access_types)
    |> validate_inclusion(:break_state, @break_states)
    |> validate_inclusion(:level, @levels)
    |> validate_inclusion(:score_strategy, @score_strategies)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:task_provider, @task_providers)
    |> validate_inclusion(:task_strategy, @task_strategies)
    |> validate_inclusion(:ranking_type, @ranking_types)
    |> validate_inclusion(:type, @types)
    |> validate_number(:match_timeout_seconds, greater_than_or_equal_to: 1)
    |> validate_required([:name, :starts_at])
    |> validate_event_id(params["event_id"])
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
  def levels, do: @levels
  def score_strategies, do: @score_strategies
  def task_providers, do: @task_providers
  def task_strategies, do: @task_strategies
  def ranking_types, do: @ranking_types
  def types, do: @types
  def public_types, do: @public_types
end
