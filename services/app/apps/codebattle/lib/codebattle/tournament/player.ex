defmodule Codebattle.Tournament.Player do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @primary_key false
  @derive Jason.Encoder

  embedded_schema do
    field(:avatar_url, :string)
    field(:id, :integer)
    field(:is_bot, :boolean)
    field(:lang, :string)
    field(:name, :string)
    field(:rank, :integer, default: 5432)
    field(:rating, :integer)
    field(:team_id, :integer)
  end

  def changeset(struct, params) do
    struct
    |> cast(Map.from_struct(params), [
      :avatar_url,
      :id,
      :is_bot,
      :lang,
      :name,
      :rank,
      :rating,
      :team_id
    ])
  end
end
