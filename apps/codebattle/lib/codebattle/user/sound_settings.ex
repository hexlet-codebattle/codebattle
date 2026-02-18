defmodule Codebattle.User.SoundSettings do
  @moduledoc false
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key false

  @types ~w(cs dendy standard silent)

  @derive {Jason.Encoder, only: [:level, :tournament_level, :type]}

  embedded_schema do
    field(:level, :integer, default: 7)
    field(:tournament_level, :integer, default: 7)
    field(:type, :string, default: "dendy")
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [:level, :tournament_level, :type])
    |> validate_number(:level, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
    |> validate_number(:tournament_level, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
    |> validate_inclusion(:type, @types)
  end
end
