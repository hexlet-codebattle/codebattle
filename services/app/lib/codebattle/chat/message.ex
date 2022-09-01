defmodule Codebattle.Chat.Message do
  use TypedStruct
  @derive Jason.Encoder

  @type type() :: :text | :info
  @type timestamp() :: pos_integer()

  typedstruct do
    field(:id, pos_integer())
    field(:type, type(), default: :text)
    field(:user_id, integer())
    field(:name, String.t())
    field(:text, String.t())
    field(:time, timestamp())
  end
end
