defmodule Codebattle.User.SoundSettings do
  @moduledoc false
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key false

  @derive {Jason.Encoder, only: [:level, :muted, :tournament_level]}

  embedded_schema do
    field(:level, :integer, default: 7)
    field(:muted, :boolean, default: false)
    field(:tournament_level, :integer, default: 7)
  end

  def changeset(struct, params) do
    struct
    |> cast(params, [:level, :muted, :tournament_level])
    |> validate_number(:level, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
    |> validate_number(:tournament_level, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
  end
end
