defmodule Codebattle.Tournament.Types.Player do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @primary_key false
  @results ~w(waiting won lost gave_up timeout)
  @derive Jason.Encoder

  embedded_schema do
    field(:id, :integer)
    field(:discord_avatar, :string)
    field(:discord_id, :integer)
    field(:github_id, :integer)
    field(:is_bot, :boolean)
    field(:is_guest, :boolean)
    field(:lang, :string)
    field(:name, :string)
    field(:public_id, :string)
    field(:rank, :integer, default: 5432)
    field(:rating, :integer)
    field(:result, :string, default: "waiting")
    field(:team_id, :integer)
  end

  def changeset(struct, params) do
    struct
    |> cast(Map.from_struct(params), [
      :github_id,
      :id,
      :is_bot,
      :is_guest,
      :lang,
      :name,
      :rank,
      :rating,
      :result,
      :team_id
    ])
    |> validate_inclusion(:result, @results)
  end
end
