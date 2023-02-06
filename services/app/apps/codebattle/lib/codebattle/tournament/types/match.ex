defmodule Codebattle.Tournament.Types.Match do
  use Ecto.Schema

  alias Codebattle.Tournament.Types

  import Ecto.Changeset
  @primary_key false
  @states ~w(pending playing canceled game_over timeout)
  @derive Jason.Encoder

  embedded_schema do
    field(:state, :string)
    field(:game_id, :integer)
    field(:duration, :integer)
    field(:round_id, :integer, default: 0)
    embeds_many(:players, Types.Player, on_replace: :delete)
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [:state, :game_id, :duration, :round_id])
    |> validate_inclusion(:state, @states)
    |> cast_embed(:players)
  end
end
