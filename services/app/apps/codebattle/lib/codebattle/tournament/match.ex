defmodule Codebattle.Tournament.Match do
  use Ecto.Schema

  import Ecto.Changeset
  @primary_key false
  @states ~w(pending playing canceled game_over timeout)
  @derive Jason.Encoder

  embedded_schema do
    field(:duration, :integer)
    field(:game_id, :integer)
    field(:player_ids, {:array, :integer}, default: [])
    field(:round_id, :integer)
    field(:state, :string)
    field(:winner_id, :integer)
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [:state, :game_id, :winner_id, :duration, :round_id, :player_ids])
    |> validate_inclusion(:state, @states)
  end
end
