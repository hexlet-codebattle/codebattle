defmodule Codebattle.GroupTournament do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.Event
  alias Codebattle.GroupTask
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.Tournament
  alias Codebattle.User

  @states ~w(waiting_participants active finished canceled)
  @slice_strategies ~w(random rating)
  @types ~w(individual ranked)
  @scoring_strategies ~w(diagonal_quadratic diagonal_linear global_linear flat_linear)
  @movement_strategies ~w(mirrored_cascade global_rerank neighbor_ladder)

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :creator_id,
             :event_id,
             :group_task_id,
             :name,
             :slug,
             :description,
             :task_description,
             :state,
             :starts_at,
             :started_at,
             :finished_at,
             :current_round_position,
             :rounds_count,
             :round_timeout_seconds,
             :seed_round_timeout_seconds,
             :include_bots,
             :last_round_started_at,
             :last_round_ended_at,
             :meta,
             :require_invitation,
             :run_on_external_platform,
             :template_id,
             :tournament_id,
             :slice_size,
             :slice_strategy,
             :max_score,
             :type,
             :slice_count,
             :place_weight,
             :scoring_strategy,
             :movement_strategy,
             :inactive_rounds_to_leave,
             :break_duration_seconds,
             :has_seed_round,
             :show_leaderboard,
             :visible_to_users
           ]}

  schema "group_tournaments" do
    belongs_to(:creator, User)
    belongs_to(:event, Event)
    belongs_to(:group_task, GroupTask)
    belongs_to(:tournament, Tournament)

    field(:name, :string)
    field(:slug, :string)
    field(:description, :string)
    field(:task_description, :string)
    field(:state, :string, default: "waiting_participants")
    field(:starts_at, :utc_datetime)
    field(:started_at, :utc_datetime)
    field(:finished_at, :utc_datetime)
    field(:current_round_position, :integer, default: 0)
    field(:rounds_count, :integer, default: 1)
    field(:round_timeout_seconds, :integer)
    field(:seed_round_timeout_seconds, :integer)
    field(:include_bots, :boolean, default: false)
    field(:require_invitation, :boolean, default: false)
    field(:run_on_external_platform, :boolean, default: false)
    field(:template_id, :string)
    field(:slice_size, :integer, default: 16)
    field(:slice_strategy, :string, default: "random")
    field(:max_score, :integer)
    field(:type, :string, default: "individual")
    field(:slice_count, :integer)
    field(:place_weight, :integer, default: 1)
    field(:scoring_strategy, :string, default: "diagonal_quadratic")
    field(:movement_strategy, :string, default: "mirrored_cascade")
    field(:inactive_rounds_to_leave, :integer, default: 2)
    field(:break_duration_seconds, :integer, default: 0)
    field(:has_seed_round, :boolean, default: false)
    field(:show_leaderboard, :boolean, default: true)
    field(:visible_to_users, :boolean, default: true)
    field(:last_round_started_at, :naive_datetime)
    field(:last_round_ended_at, :naive_datetime)
    field(:meta, :map, default: %{})

    field(:is_live, :boolean, virtual: true, default: false)
    field(:players_count, :integer, virtual: true, default: 0)
    field(:current_round, :map, virtual: true)

    has_many(:players, GroupTournamentPlayer)

    timestamps()
  end

  def changeset(group_tournament, attrs \\ %{}) do
    group_tournament
    |> cast(attrs, [
      :creator_id,
      :event_id,
      :group_task_id,
      :name,
      :slug,
      :description,
      :task_description,
      :state,
      :starts_at,
      :started_at,
      :finished_at,
      :current_round_position,
      :rounds_count,
      :round_timeout_seconds,
      :seed_round_timeout_seconds,
      :include_bots,
      :require_invitation,
      :run_on_external_platform,
      :template_id,
      :tournament_id,
      :slice_size,
      :slice_strategy,
      :last_round_started_at,
      :last_round_ended_at,
      :meta,
      :max_score,
      :type,
      :slice_count,
      :place_weight,
      :scoring_strategy,
      :movement_strategy,
      :inactive_rounds_to_leave,
      :break_duration_seconds,
      :has_seed_round,
      :show_leaderboard,
      :visible_to_users
    ])
    |> validate_required([
      :group_task_id,
      :name,
      :slug,
      :description,
      :starts_at,
      :rounds_count,
      :round_timeout_seconds
    ])
    |> update_change(:slug, &normalize_slug/1)
    |> update_change(:template_id, &normalize_optional_string/1)
    |> update_change(:task_description, &normalize_optional_string/1)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:slice_strategy, @slice_strategies)
    |> validate_inclusion(:type, @types)
    |> validate_inclusion(:scoring_strategy, @scoring_strategies)
    |> validate_inclusion(:movement_strategy, @movement_strategies)
    |> validate_number(:slice_size, greater_than: 0)
    |> validate_number(:place_weight, greater_than: 0)
    |> validate_number(:inactive_rounds_to_leave, greater_than: 0)
    |> validate_number(:break_duration_seconds, greater_than_or_equal_to: 0)
    |> validate_length(:name, min: 2, max: 255)
    |> validate_length(:slug, min: 2, max: 255)
    |> validate_length(:description, min: 3, max: 7531)
    |> validate_length(:task_description, max: 32_768)
    |> validate_length(:template_id, max: 255)
    |> validate_number(:rounds_count, greater_than: 0)
    |> validate_number(:round_timeout_seconds, greater_than: 0)
    |> validate_number(:seed_round_timeout_seconds, greater_than: 0)
    |> validate_template_id()
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:group_task_id)
  end

  def states, do: @states
  def types, do: @types
  def slice_strategies, do: @slice_strategies
  def scoring_strategies, do: @scoring_strategies
  def movement_strategies, do: @movement_strategies

  @doc """
  Returns true if this is the seeding round of a ranked tournament.

  When `has_seed_round` is true, round 1 is the seeding pass (solo-vs-bots
  to compute seed_score, used to slot players into initial slices) and
  rounds 2..rounds_count are the slice rounds — so `rounds_count = 6` gives
  1 seed + 5 slice rounds. When `has_seed_round` is false, every round is
  a slice round and round 1 is no different from the rest.
  """
  def seeding_round?(%__MODULE__{type: "ranked", has_seed_round: true, current_round_position: 1}), do: true

  def seeding_round?(_), do: false

  @doc """
  Returns true if this tournament uses the new multiplayer slice flow.
  """
  def ranked?(%__MODULE__{type: "ranked"}), do: true
  def ranked?(_), do: false

  defp normalize_slug(nil), do: nil
  defp normalize_slug(slug), do: slug |> String.trim() |> String.downcase()

  defp normalize_optional_string(nil), do: nil

  defp normalize_optional_string(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      trimmed -> trimmed
    end
  end

  defp normalize_optional_string(value), do: value

  defp validate_template_id(changeset) do
    if get_field(changeset, :run_on_external_platform) do
      validate_required(changeset, [:template_id])
    else
      changeset
    end
  end
end
