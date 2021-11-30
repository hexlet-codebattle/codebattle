defmodule Codebattle.Tournament.Types.Player do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @primary_key false
  @game_results ~w(waiting won lost gave_up timeout)
  @derive Jason.Encoder

  embedded_schema do
    field(:id, :integer)
    field(:team_id, :integer)
    field(:public_id, :string)
    field(:github_id, :integer)
    field(:discord_id, :integer)
    field(:discord_avatar, :string)
    field(:lang, :string)
    field(:name, :string)
    field(:rating, :integer)
    field(:rank, :integer, default: 5432)
    field(:guest, :boolean)
    field(:is_bot, :boolean)
    field(:game_result, :string, default: "pending")
  end

  def changeset(struct, params) do
    struct
    |> cast(Map.from_struct(params), [
      :id,
      :team_id,
      :lang,
      :name,
      :github_id,
      :rating,
      :rank,
      :guest,
      :is_bot,
      :game_result
    ])
    |> validate_inclusion(:game_result, @game_results)
  end
end
