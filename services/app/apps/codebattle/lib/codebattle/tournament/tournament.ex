defmodule Codebattle.Tournament do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  alias Codebattle.AtomizedMap
  alias Codebattle.Tournament.Individual

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :access_token,
             :access_type,
             :last_round_ended_at,
             :last_round_started_at,
             :break_duration_seconds,
             :match_timeout_seconds,
             :break_state,
             :creator_id,
             :current_round,
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
             :starts_at,
             :state,
             :stats,
             :task_pack_name,
             :task_provider,
             :task_strategy,
             :type,
             :use_chat,
             :use_infinite_break
           ]}

  @access_types ~w(public token)
  @break_states ~w(on off)
  @levels ~w(elementary easy medium hard)
  @states ~w(waiting_participants canceled active finished)
  @task_providers ~w(level task_pack tags)
  @task_strategies ~w(game round)
  @types ~w(individual team stairway swiss ladder)

  @default_match_timeout Application.compile_env(:codebattle, :tournament_match_timeout)

  schema "tournaments" do
    belongs_to(:creator, Codebattle.User)

    field(:access_token, :string)
    field(:access_type, :string, default: "public")
    field(:break_duration_seconds, :integer, default: 42)
    field(:break_state, :string, default: "off")
    field(:current_round, :integer, default: 0)
    field(:default_language, :string, default: "js")
    field(:description, :string)
    field(:finished_at, :naive_datetime)
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
    field(:use_chat, :boolean, default: true)
    field(:use_infinite_break, :boolean, default: false)
    field(:winner_ids, {:array, :integer})

    field(:is_live, :boolean, virtual: true, default: false)
    field(:players_table, :string, virtual: true)
    field(:matches_table, :string, virtual: true)
    field(:tasks_table, :string, virtual: true)
    field(:module, :any, virtual: true, default: Individual)
    field(:played_pair_ids, EctoMapSet, of: {:array, :integer}, virtual: true, default: [])
    field(:players_count, :integer, virtual: true, default: 0)
    field(:top_player_ids, {:array, :integer}, virtual: true, default: [])
    field(:round_tasks, :map, virtual: true, default: %{})
    field(:task_pack_name, :string, virtual: true)
    field(:show_results, :boolean, virtual: true, default: true)

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
      :description,
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
      :type,
      :use_chat,
      :use_infinite_break,
      :show_results,
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
    |> add_meta(params)
  end

  defp add_creator(changeset, nil), do: changeset

  defp add_creator(changeset, creator) do
    change(changeset, %{creator: creator})
  end

  defp add_meta(changeset, params) do
    params |> IO.inspect
    rounds_limit = params["rounds_limit"] || params[:rounds_limit] || "3"
    rounds_config_type = params["rounds_config_type"] || params[:rounds_config_type] || "all"

    config = get_rounds_config(params["rounds_config_json"] || params[:rounds_config_json] || "[]")

    meta = %{
      rounds_limit: String.to_integer(rounds_limit),
      rounds_config_type: rounds_config_type,
      rounds_config: config,
    }

    change(changeset, %{meta: meta})
  end

  def types, do: @types
  def access_types, do: @access_types
  def levels, do: @levels
  def task_providers, do: @task_providers
  def task_strategies, do: @task_strategies

  defp get_rounds_config(string) do
    try do
      Jason.decode!(string) |> IO.inspect
    rescue
      _ -> []
    end
  end
end
