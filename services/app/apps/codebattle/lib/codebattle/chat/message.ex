defmodule Codebattle.Chat.Message do
  @moduledoc false
  use TypedStruct

  @derive Jason.Encoder

  @type type() :: :text | :info
  @type timestamp() :: pos_integer()
  @type meta_type() :: %{
          type: String.t(),
          target_user_id: integer() | nil
        }

  typedstruct do
    field(:id, pos_integer())
    field(:type, type(), default: :text)
    field(:user_id, integer())
    field(:name, String.t())
    field(:text, String.t())
    field(:time, timestamp())
    field(:meta, meta_type())
  end
end
