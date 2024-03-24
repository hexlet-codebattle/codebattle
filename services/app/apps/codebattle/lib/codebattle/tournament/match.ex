defmodule Codebattle.Tournament.Match do
  use Ecto.Schema

  import Ecto.Changeset

  alias Runner.AtomizedMap

  @derive Jason.Encoder
  @primary_key false

  @states ~w(pending playing canceled game_over timeout)

  embedded_schema do
    field(:duration_sec, :integer)
    field(:finished_at, :naive_datetime)
    field(:game_id, :integer)
    field(:id, :integer)
    field(:level, :string)
    field(:player_ids, {:array, :integer}, default: [])
    field(:player_results, AtomizedMap, default: %{})
    field(:round_id, :integer)
    field(:round_position, :integer)
    field(:started_at, :naive_datetime)
    field(:state, :string)
    field(:winner_id, :integer)
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [
      :duration_sec,
      :finished_at,
      :game_id,
      :id,
      :integer,
      :level,
      :player_ids,
      :round_id,
      :round_position,
      :started_at,
      :state,
      :winner_id
    ])
    |> validate_inclusion(:state, @states)
  end

  def states, do: @states
end
