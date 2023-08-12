defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.AtomizedMap
  alias Codebattle.Tournament.Individual

  @derive {Jason.Encoder,
           only: [
             :creator,
             :creator_id,
             :id,
             :is_live,
             :level,
             :matches,
             :meta,
             :name,
             :players,
             :players_limit,
             :starts_at,
             :state,
             :stats,
             :type
           ]}

  @access_types ~w(public token)
  @break_states ~w(on off)
  @levels ~w(elementary easy medium hard)
  @states ~w(waiting_participants canceled active finished)
  @task_providers ~w(level task_pack tags)
  @task_strategies ~w(game round)
  @types ~w(individual team stairway)

  @default_match_timeout Application.compile_env(:codebattle, :tournament_match_timeout)
  @default_timezone "Europe/Moscow"

  schema "tournaments" do
    belongs_to(:creator, Codebattle.User)

    field(:access_token, :string)
    field(:access_type, :string, default: "public")
    field(:break_duration_seconds, :integer, default: 42)
    field(:break_state, :string, default: "off")
    field(:current_round, :integer, default: 0)
    field(:default_language, :string, default: "js")
    field(:finished_at, :utc_datetime)
    field(:labels, {:array, :string})
    field(:last_round_ended_at, :naive_datetime)
    field(:last_round_started_at, :naive_datetime)
    field(:level, :string, default: "elementary")
    field(:match_timeout_seconds, :integer, default: @default_match_timeout)
    field(:matches, AtomizedMap, default: %{})
    field(:meta, AtomizedMap, default: %{})
    field(:name, :string)
    field(:players, AtomizedMap, default: %{})
    field(:players_limit, :integer)
    field(:starts_at, :utc_datetime)
    field(:state, :string, default: "waiting_participants")
    field(:stats, AtomizedMap, default: %{})
    field(:task_provider, :string, default: "level")
    field(:task_strategy, :string, default: "game")
    field(:type, :string, default: "individual")
    field(:winner_ids, {:array, :integer})

    field(:is_live, :boolean, virtual: true, default: false)
    field(:module, :any, virtual: true, default: Individual)
    field(:played_pair_ids, EctoMapSet, of: {:array, :integer}, virtual: true, default: [])
    field(:players_count, :integer, virtual: true, default: 0)
    field(:round_tasks, :map, virtual: true, default: %{})
    field(:task_pack_name, :string, virtual: true)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :access_token,
      :access_type,
      :break_duration_seconds,
      :break_state,
      :current_round,
      :default_language,
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
      :starts_at,
      :state,
      :task_strategy,
      :type
    ])
    |> validate_inclusion(:access_type, @access_types)
    |> validate_inclusion(:break_state, @break_states)
    |> validate_inclusion(:level, @levels)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:task_provider, @task_providers)
    |> validate_inclusion(:task_strategy, @task_strategies)
    |> validate_inclusion(:type, @types)
    |> validate_number(:match_timeout_seconds, greater_than_or_equal_to: 1)
    |> validate_required([:name, :starts_at])
    |> add_creator(params["creator"] || params[:creator])
  end

  defp add_creator(changeset, nil), do: changeset

  defp add_creator(changeset, creator) do
    change(changeset, %{creator: creator})
  end

  def types, do: @types
  def access_types, do: @access_types
  def levels, do: @levels
  def task_providers, do: @task_providers
  def task_strategies, do: @task_strategies
end
