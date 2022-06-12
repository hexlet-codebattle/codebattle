defmodule Codebattle.Chat.Server do
  use GenServer

  alias Codebattle.Chat
  alias Codebattle.User

  @default_message_ttl :timer.hours(1)
  @default_clean_timeout :timer.minutes(1)
  @initial_state %{
    message_ttl: @default_message_ttl,
    clean_timeout: @default_clean_timeout,
    banned_user_ids: [],
    messages_id_sec: 1,
    users: [],
    messages: []
  }

  # API

  @spec start_link(Chat.chat_type(), Chat.start_params()) :: GenServer.on_start()
  def start_link(chat_type, params) do
    GenServer.start_link(__MODULE__, params, name: chat_key(chat_type))
  end

  @spec join_chat(Chat.chat_type(), User.t()) ::
          %{
            users: list(User.t()),
            messages: list(Chat.message())
          }
  def join_chat(chat_type, user) do
    GenServer.call(chat_key(chat_type), {:join, user})
  catch
    :exit, _reason -> %{users: [], messages: []}
  end

  @spec leave_chat(Chat.chat_type(), User.t()) :: list(User.t())
  def leave_chat(chat_type, user) do
    GenServer.call(chat_key(chat_type), {:leave, user.id})
  catch
    :exit, _reason -> []
  end

  @spec get_users(Chat.chat_type()) :: list(User.t())
  def get_users(chat_type) do
    GenServer.call(chat_key(chat_type), :get_users)
  catch
    :exit, _reason -> []
  end

  @spec get_messages(Chat.chat_type()) :: list(Chat.message())
  def get_messages(chat_type) do
    GenServer.call(chat_key(chat_type), :get_messages)
  catch
    :exit, _reason -> []
  end

  @spec add_message(Chat.chat_type(), Chat.message()) ::
          {:ok, Chat.message()}
          | {:error, atom()}
  def add_message(chat_type, message) do
    GenServer.call(chat_key(chat_type), {:add_message, message})
  catch
    :exit, _reason -> {:error, :no_chat}
  end

  @spec delete_user_messages(Chat.chat_type(), Chat.user_id()) :: :ok
  def delete_user_messages(chat_type, user_id) do
    GenServer.cast(chat_key(chat_type), {:delete_user_messages, user_id})
  catch
    :exit, _reason -> :ok
  end

  @spec add_to_banned(Chat.chat_type(), Chat.user_id()) :: :ok
  def add_to_banned(chat_type, user_id) do
    GenServer.cast(chat_key(chat_type), {:add_to_banned, user_id})
  catch
    :exit, _reason -> :ok
  end

  @spec clean_banned(Chat.chat_type()) :: :ok
  def clean_banned(chat_type) do
    GenServer.cast(chat_key(chat_type), :clean_banned)
  catch
    :exit, _reason -> :ok
  end

  # SERVER
  @impl GenServer
  def init(params) do
    message_ttl =
      params
      |> Map.get(:message_ttl, @default_message_ttl)
      |> div(1000)

    clean_timeout = Map.get(params, :clean_timeout, @default_clean_timeout)
    Process.send_after(self(), :clean_messages, clean_timeout)

    {:ok, %{@initial_state | message_ttl: message_ttl, clean_timeout: clean_timeout}}
  end

  @impl GenServer
  def handle_call({:join, user}, _from, state) do
    new_users = [user | state.users]

    {:reply, %{users: new_users, messages: state.messages}, %{state | users: new_users}}
  end

  @impl GenServer
  def handle_call({:leave, user_id}, _from, state) do
    new_users =
      Enum.reject(
        state.users,
        fn user -> user.id == user_id end
      )

    {:reply, new_users, %{state | users: new_users}}
  end

  @impl GenServer
  def handle_call(:get_users, _from, state) do
    %{users: users} = state
    {:reply, users, state}
  end

  @impl GenServer
  def handle_call(:get_messages, _from, state) do
    %{messages: messages} = state
    {:reply, Enum.reverse(messages), state}
  end

  @impl GenServer
  def handle_call({:add_message, message}, _from, state) do
    if can_send_message?(message.user_id, state) do
      new_message = %{message | id: state.messages_id_sec}
      new_id = state.messages_id_sec + 1

      {:reply, {:ok, new_message},
       %{
         state
         | messages_id_sec: new_id,
           messages: [new_message | state.messages]
       }}
    else
      {:reply, {:error, :unauthorized}, state}
    end
  end

  @impl GenServer
  def handle_cast({:delete_user_messages, user_id}, state) do
    new_messages = Enum.reject(state.messages, fn msg -> msg.user_id == user_id end)

    {:noreply, %{state | messages: new_messages}}
  end

  @impl GenServer
  def handle_cast({:add_to_banned, user_id}, state) do
    {:noreply, %{state | banned_user_ids: [user_id | state.banned_user_ids]}}
  end

  @impl GenServer
  def handle_cast(:clean_banned, state) do
    {:noreply, %{state | banned_user_ids: []}}
  end

  @impl GenServer
  def handle_info(:clean_messages, %{messages: messages} = state) do
    new_messages =
      Enum.reject(
        messages,
        fn message ->
          Chat.now() - message.time >= state.message_ttl
        end
      )

    Process.send_after(self(), :clean_messages, state.clean_timeout)
    {:noreply, %{state | messages: new_messages}}
  end

  # Helpers

  # for system messages
  defp can_send_message?(nil, _), do: true

  defp can_send_message?(user_id, state) do
    !Enum.member?(state.banned_user_ids, user_id)
  end

  defp chat_key(:lobby), do: :LOBBY_CHAT
  defp chat_key({type, id}), do: {:via, :gproc, {:n, :l, {:chat, "#{type}_#{id}"}}}
end
