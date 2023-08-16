defmodule Codebattle.Tournament.Match do
  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.AtomizedMap

  @derive Jason.Encoder
  @primary_key false

  @states ~w(pending playing canceled game_over timeout)

  embedded_schema do
    field(:id, :integer)
    field(:game_id, :integer)
    field(:player_ids, {:array, :integer}, default: [])
    field(:player_results, AtomizedMap, default: [])
    field(:round, :integer)
    field(:state, :string)
    field(:winner_id, :integer)
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [:id, :state, :game_id, :winner_id, :round, :player_ids])
    |> validate_inclusion(:state, @states)
  end
end
