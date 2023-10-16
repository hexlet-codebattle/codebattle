defmodule Codebattle.Chat do
  alias Codebattle.Chat
  alias Codebattle.User

  @type chat_type() :: :lobby | {:tournament, integer()} | {:game, integer()}
  @type message() :: Chat.Message.t()
  @type user_id() :: integer() | nil

  @type start_params() :: %{
          optional(:message_ttl) => pos_integer(),
          optional(:clean_timeout) => pos_integer()
        }

  @type add_message_params() :: %{
          required(:type) => Chat.Message.type(),
          required(:text) => String.t(),
          optional(:user_id) => user_id(),
          optional(:name) => String.t(),
          optional(:meta) => Chat.Message.meta_type()
        }

  @type ban_user_params() :: %{
          admin_name: String.t(),
          user_id: user_id(),
          name: String.t()
        }

  @spec start_link(chat_type(), Chat.start_params()) :: GenServer.on_start()
  def start_link(chat_type, params \\ %{}), do: Chat.Server.start_link(chat_type, params)

  @spec join_chat(chat_type(), User.t()) ::
          %{users: list(User.t()), messages: list(message())}
  defdelegate join_chat(chat_type, user), to: Chat.Server

  @spec leave_chat(chat_type(), User.t()) :: list(User.t())
  defdelegate leave_chat(chat_type, user), to: Chat.Server

  @spec get_users(chat_type()) :: list(User.t())
  defdelegate get_users(chat_type), to: Chat.Server

  @spec get_messages(chat_type()) :: list(message())
  defdelegate get_messages(chat_type), to: Chat.Server

  @spec clean_banned(chat_type()) :: :ok
  defdelegate clean_banned(chat_type), to: Chat.Server

  @spec add_message(chat_type(), add_message_params) :: :ok
  def add_message(chat_type, params) do
    message = %Chat.Message{
      type: Map.get(params, :type),
      user_id: Map.get(params, :user_id),
      name: Map.get(params, :name),
      text: Map.get(params, :text),
      time: now(),
      meta: Map.get(params, :meta)
    }

    case Chat.Server.add_message(chat_type, message) do
      {:ok, message_with_id} ->
        Codebattle.PubSub.broadcast("chat:new_msg", %{
          chat_type: chat_type,
          message: message_with_id
        })

      {:error, _reason} ->
        :noop
    end

    :ok
  end

  @spec ban_user(chat_type(), ban_user_params()) :: :ok
  def ban_user(chat_type, params) do
    Chat.Server.delete_user_messages(chat_type, params.user_id)
    Chat.Server.add_to_banned(chat_type, params.user_id)

    add_message(
      chat_type,
      %{
        type: :info,
        text: "#{params.name} has been banned by #{params.admin_name}",
        meta: %{type: "system", target_user_id: params.user_id}
      }
    )

    Codebattle.PubSub.broadcast("chat:user_banned", %{
      chat_type: chat_type,
      payload: params
    })

    :ok
  end

  @spec now() :: pos_integer()
  def now, do: :os.system_time(:seconds)
end
