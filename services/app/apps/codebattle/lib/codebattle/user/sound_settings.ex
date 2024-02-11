defmodule User.SoundSettings do
  use Ecto.Schema

  import Ecto.Changeset
  @primary_key false

  @types ~w(cs dendy standard silent)

  @derive {Jason.Encoder, only: [:level, :type]}

  embedded_schema do
    field(:level, :integer, default: 7)
    field(:type, :string, default: "dendy")
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [:level, :type])
    |> validate_length(:level, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
    |> validate_inclusion(:type, @types)
  end
end
