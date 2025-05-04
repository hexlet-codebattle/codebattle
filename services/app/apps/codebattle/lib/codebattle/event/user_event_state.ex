defmodule Codebattle.UserEvent.State do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  @derive Jason.Encoder

  @type t :: %__MODULE__{}

  @primary_key false
  embedded_schema do
  end

  def changeset(state, attrs) do
    cast(state, attrs, [])
  end
end
