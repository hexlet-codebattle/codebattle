defmodule Codebattle.EventStage do
  @moduledoc false
  use Ecto.Schema

  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :slug,
             :name,
             :status,
             :type,
             :dates,
             :action_button_text,
             :tournament_id
           ]}

  embedded_schema do
    field(:slug, :string)
    field(:name, :string)
    field(:status, Ecto.Enum, values: [:pending, :passed, :active])
    field(:type, Ecto.Enum, values: [:tournament, :enterance])
    field(:dates, :string)
    field(:action_button_text, :string)
    field(:tournament_id, :integer)
  end

  def changeset(stage, params \\ %{}) do
    stage
    |> cast(params, [:slug, :name, :status, :type, :dates, :action_button_text, :tournament_id])
    |> validate_required([:slug, :name, :status, :type])
    |> validate_inclusion(:status, [:pending, :passed, :active])
    |> validate_inclusion(:type, [:tournament, :enterance])
  end
end
