defmodule Codebattle.Tournament.Player do
  @moduledoc false
  use Ecto.Schema

  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @primary_key false

  @derive Jason.Encoder

  @fields [
    :avatar_url,
    :clan,
    :clan_id,
    :id,
    :is_bot,
    :lang,
    :matches_ids,
    :name,
    :place,
    :rank,
    :rating,
    :score,
    :team_id,
    :draw_index,
    :wr_joined_at,
    :wins_count
  ]

  @states ~w(
  active
  banned
  finished
  finished_round
  matchmaking_active
  matchmaking_paused
  )

  embedded_schema do
    field(:avatar_url, :string)
    field(:clan, :string)
    field(:clan_id, :integer)
    field(:id, :integer)
    field(:is_bot, :boolean)
    field(:draw_index, :integer, default: 1)
    field(:lang, :string)
    field(:matches_ids, {:array, :integer}, default: [])
    field(:name, :string)
    field(:place, :integer, default: 0)
    field(:rank, :integer, default: 5432)
    field(:rating, :integer)
    field(:returned, :boolean, default: false)
    field(:score, :integer, default: 0)
    field(:state, :string, default: "active")
    field(:task_ids, {:array, :integer}, default: [])
    field(:team_id, :integer)
    field(:wins_count, :integer, default: 0)
    field(:wr_joined_at, :integer)
  end

  @spec new!(params :: map()) :: t()
  def new!(%_{} = params), do: params |> Map.from_struct() |> new!()

  def new!(%{} = params) do
    %__MODULE__{}
    |> cast(params, @fields)
    |> validate_required([:id, :name])
    |> validate_inclusion(:state, @states)
    |> apply_action!(:validate)
  end
end
