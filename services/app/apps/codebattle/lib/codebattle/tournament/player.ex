defmodule Codebattle.Tournament.Player do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @primary_key false
  @derive Jason.Encoder

  @fields [:avatar_url, :id, :is_bot, :lang, :name, :rank, :rating, :team_id]

  embedded_schema do
    field(:avatar_url, :string)
    field(:id, :integer)
    field(:is_bot, :boolean)
    field(:lang, :string)
    field(:name, :string)
    field(:rank, :integer, default: 5432)
    field(:rating, :integer)
    field(:team_id, :integer)
    field(:score, :integer, default: 0)
    field(:wins_count, :integer, default: 0)
  end

  @spec new!(params :: map()) :: t()
  def new!(params = %_{}), do: params |> Map.from_struct() |> new!()

  def new!(params = %{}) do
    %__MODULE__{}
    |> cast(params, @fields)
    |> validate_required([:id, :name])
    |> apply_action!(:validate)
  end
end
