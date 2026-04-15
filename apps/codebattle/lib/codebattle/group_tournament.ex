defmodule Codebattle.GroupTournament do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTask
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.GroupTournamentToken
  alias Codebattle.User

  @states ~w(waiting_participants active finished canceled)

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :creator_id,
             :group_task_id,
             :name,
             :slug,
             :description,
             :state,
             :starts_at,
             :started_at,
             :finished_at,
             :current_round_position,
             :rounds_count,
             :round_timeout_seconds,
             :include_bots,
             :last_round_started_at,
             :last_round_ended_at,
             :meta,
             :require_invitation,
             :run_on_external_platform
           ]}

  schema "group_tournaments" do
    belongs_to(:creator, User)
    belongs_to(:group_task, GroupTask)

    field(:name, :string)
    field(:slug, :string)
    field(:description, :string)
    field(:state, :string, default: "waiting_participants")
    field(:starts_at, :utc_datetime)
    field(:started_at, :utc_datetime)
    field(:finished_at, :utc_datetime)
    field(:current_round_position, :integer, default: 0)
    field(:rounds_count, :integer, default: 1)
    field(:round_timeout_seconds, :integer)
    field(:include_bots, :boolean, default: false)
    field(:require_invitation, :boolean, default: false)
    field(:run_on_external_platform, :boolean, default: false)
    field(:last_round_started_at, :naive_datetime)
    field(:last_round_ended_at, :naive_datetime)
    field(:meta, :map, default: %{})

    field(:is_live, :boolean, virtual: true, default: false)
    field(:players_count, :integer, virtual: true, default: 0)
    field(:current_round, :map, virtual: true)

    has_many(:players, GroupTournamentPlayer)
    has_many(:tokens, GroupTournamentToken)

    timestamps()
  end

  def changeset(group_tournament, attrs \\ %{}) do
    group_tournament
    |> cast(attrs, [
      :creator_id,
      :group_task_id,
      :name,
      :slug,
      :description,
      :state,
      :starts_at,
      :started_at,
      :finished_at,
      :current_round_position,
      :rounds_count,
      :round_timeout_seconds,
      :include_bots,
      :require_invitation,
      :run_on_external_platform,
      :last_round_started_at,
      :last_round_ended_at,
      :meta
    ])
    |> validate_required([
      :creator_id,
      :group_task_id,
      :name,
      :slug,
      :description,
      :starts_at,
      :rounds_count,
      :round_timeout_seconds
    ])
    |> update_change(:slug, &normalize_slug/1)
    |> validate_inclusion(:state, @states)
    |> validate_length(:name, min: 2, max: 255)
    |> validate_length(:slug, min: 2, max: 255)
    |> validate_length(:description, min: 3, max: 7531)
    |> validate_number(:rounds_count, greater_than: 0)
    |> validate_number(:round_timeout_seconds, greater_than: 0)
    |> unique_constraint(:slug)
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:group_task_id)
  end

  def states, do: @states

  defp normalize_slug(nil), do: nil
  defp normalize_slug(slug), do: slug |> String.trim() |> String.downcase()
end
