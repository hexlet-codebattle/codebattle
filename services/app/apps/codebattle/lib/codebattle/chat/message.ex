defmodule Codebattle.Chat.Message do
  use TypedStruct
  @derive Jason.Encoder

  @type type() :: :text | :info
  @type timestamp() :: pos_integer()
  @type user() :: %{
    name: String.t(),
    id: integer() | nil
  }
  @type key() :: String.t()
  @type room_type() :: %{
    id: String.t() | nil,
    meta: String.t(),
    members: [user()]
 }

  typedstruct do
    field(:id, pos_integer())
    field(:type, type(), default: :text)
    field(:user_id, integer())
    field(:name, String.t())
    field(:text, String.t())
    field(:time, timestamp())
    field(:meta, String.t())
    field(:room, room_type())
  end
end
