defmodule Codebattle.Tournament.Types.Data do
  use Ecto.Schema

  alias Codebattle.Tournament.Types

  import Ecto.Changeset

  @primary_key false
  @derive Jason.Encoder

  embedded_schema do
    field(:intended_player_ids, {:array, :integer}, default: [])
    embeds_many(:players, Types.Player, on_replace: :delete)
    embeds_many(:matches, Types.Match)
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [:intended_player_ids])
    |> cast_embed(:matches)
    |> cast_embed(:players)
  end
end
