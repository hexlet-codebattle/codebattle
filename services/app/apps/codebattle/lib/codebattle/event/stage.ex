defmodule Codebattle.Event.Stage do
  @moduledoc false
  use Ecto.Schema

  import Ecto.Changeset

  alias Runner.AtomizedMap

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :action_button_text,
             :confirmation_text,
             :dates,
             :name,
             :slug,
             :status,
             :tournament_id,
             :playing_type,
             :type
           ]}

  @primary_key false

  embedded_schema do
    field(:action_button_text, :string)
    field(:confirmation_text, :string)
    field(:dates, :string)
    field(:name, :string)
    field(:slug, :string)
    field(:status, Ecto.Enum, values: [:pending, :passed, :active])
    field(:tournament_id, :integer)
    field(:playing_type, Ecto.Enum, values: [:single, :global])
    field(:tournament_meta, AtomizedMap)
    field(:type, Ecto.Enum, values: [:tournament, :entrance])
  end

  def changeset(stage, params \\ %{}) do
    stage
    |> cast(params, [
      :action_button_text,
      :confirmation_text,
      :dates,
      :name,
      :slug,
      :status,
      :tournament_id,
      :playing_type,
      :type
    ])
    |> validate_required([:slug, :name, :status, :type])
    |> validate_inclusion(:status, [:pending, :passed, :active])
    |> validate_inclusion(:type, [:tournament, :entrance])
    |> validate_inclusion(:playing_type, [:single, :global])
  end
end
