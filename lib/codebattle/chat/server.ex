defmodule Codebattle.Chat.Server do
  @moduledoc false
  use GenServer

  alias Codebattle.Chat
  alias Codebattle.User

  require Logger

  @default_message_ttl to_timeout(hour: 1)
  @default_clean_timeout to_timeout(minute: 1)
  @reactions ~w(laugh smile heart fire rocket clap eyes thumbs_up)
  @reaction_languages ~w(clojure cpp csharp css dart dlang elixir golang java js kotlin less mongodb mysql php
                         postgresql python ruby rust sass stylus swift ts zig)
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
    GenServer.start_link(__MODULE__, [chat_type, params], name: chat_key(chat_type))
  end

  # IDEA store only small projection of users in chats.
  # Do not pollute memory
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

  @spec copy_messages(Chat.chat_type(), Chat.chat_type()) :: :ok | {:error, atom()}
  def copy_messages(source_chat_type, target_chat_type) do
    messages = get_messages(source_chat_type)
    GenServer.call(chat_key(target_chat_type), {:copy_messages, messages})
  catch
    :exit, _reason -> {:error, :no_chat}
  end

  @spec add_message(Chat.chat_type(), Chat.message()) ::
          {:ok, Chat.message()}
          | {:error, atom()}
  def add_message(chat_type, message) do
    GenServer.call(chat_key(chat_type), {:add_message, message})
  catch
    :exit, _reason -> {:error, :no_chat}
  end

  @spec react(Chat.chat_type(), pos_integer(), User.t(), String.t()) :: :ok | {:error, atom()}
  def react(chat_type, message_id, user, reaction) do
    GenServer.call(chat_key(chat_type), {:react, chat_type, message_id, user, reaction})
  catch
    :exit, _reason -> {:error, :no_chat}
  end

  @spec delete_user_messages(Chat.chat_type(), Chat.user_id()) :: :ok
  def delete_user_messages(chat_type, user_id) do
    GenServer.cast(chat_key(chat_type), {:delete_user_messages, user_id})
  catch
    :exit, _reason -> :ok
  end

  @spec delete_message(Chat.chat_type(), pos_integer(), Chat.user_id(), boolean()) ::
          {:ok, pos_integer()} | {:error, atom()}
  def delete_message(chat_type, message_id, user_id, can_delete_any?) do
    GenServer.call(chat_key(chat_type), {:delete_message, message_id, user_id, can_delete_any?})
  catch
    :exit, _reason -> {:error, :no_chat}
  end

  @spec delete_game_messages(Chat.chat_type(), pos_integer(), list(Chat.user_id())) :: list(pos_integer())
  def delete_game_messages(chat_type, game_id, user_ids) do
    GenServer.call(chat_key(chat_type), {:delete_game_messages, game_id, user_ids})
  catch
    :exit, _reason -> []
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
  def init([chat_type, params]) do
    message_ttl =
      params
      |> Map.get(:message_ttl, @default_message_ttl)
      |> div(1000)

    clean_timeout = Map.get(params, :clean_timeout, @default_clean_timeout)
    Process.send_after(self(), :clean_messages, clean_timeout)

    Logger.debug("Start chat server for #{inspect(chat_type)}")
    {:ok, %{@initial_state | message_ttl: message_ttl, clean_timeout: clean_timeout}}
  end

  @impl GenServer
  def handle_call({:join, user}, _from, state) do
    new_users = [user | state.users]

    {:reply, %{users: new_users, messages: Enum.reverse(state.messages)}, %{state | users: new_users}}
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
  def handle_call({:copy_messages, messages}, _from, state) do
    {new_messages, next_id} =
      Enum.map_reduce(messages, state.messages_id_sec, fn message, id ->
        {%{message | id: id}, id + 1}
      end)

    {:reply, :ok, %{state | messages: Enum.reverse(new_messages, state.messages), messages_id_sec: next_id}}
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
  def handle_call({:delete_message, message_id, user_id, can_delete_any?}, _from, state) do
    message = Enum.find(state.messages, fn msg -> msg.id == message_id end)

    cond do
      is_nil(message) ->
        {:reply, {:error, :not_found}, state}

      can_delete_any? or own_message?(message, user_id) ->
        new_messages = Enum.reject(state.messages, fn msg -> msg.id == message_id end)
        {:reply, {:ok, message_id}, %{state | messages: new_messages}}

      true ->
        {:reply, {:error, :unauthorized}, state}
    end
  end

  @impl GenServer
  def handle_call({:react, chat_type, message_id, user, reaction}, _from, state) do
    message = Enum.find(state.messages, &(&1.id == message_id))

    case validate_reaction(message, user, reaction, state) do
      :ok ->
        reactions =
          case Map.get(message.reactions, user.id) do
            %{reaction: ^reaction} -> Map.delete(message.reactions, user.id)
            _ -> Map.put(message.reactions, user.id, %{reaction: reaction, name: user.name})
          end

        updated_message = %{message | reactions: reactions}
        messages = Enum.map(state.messages, &if(&1.id == message_id, do: updated_message, else: &1))

        # Publish from the server so concurrent reactions reach clients in mutation order.
        Codebattle.PubSub.broadcast("chat:reactions_updated", %{chat_type: chat_type, message: updated_message})

        {:reply, :ok, %{state | messages: messages}}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  @impl GenServer
  def handle_call({:delete_game_messages, game_id, user_ids}, _from, state) do
    {deleted, kept} =
      Enum.split_with(state.messages, fn message ->
        message.user_id in user_ids && game_message?(message, game_id)
      end)

    {:reply, Enum.map(deleted, & &1.id), %{state | messages: kept}}
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

  defp game_message?(%{meta: %{"game_id" => game_id}}, game_id), do: true
  defp game_message?(_message, _game_id), do: false

  defp validate_reaction(nil, _user, _reaction, _state), do: {:error, :not_found}

  defp validate_reaction(message, user, reaction, state) do
    cond do
      !is_integer(user.id) or user.id == 0 or !can_send_message?(user.id, state) ->
        {:error, :unauthorized}

      message.type != :text or !can_react_to_message?(message, user.id) ->
        {:error, :unauthorized}

      !valid_reaction?(reaction) ->
        {:error, :invalid_reaction}

      true ->
        :ok
    end
  end

  defp valid_reaction?("lang:" <> lang), do: lang in @reaction_languages
  defp valid_reaction?(reaction), do: reaction in @reactions

  defp can_react_to_message?(%{meta: %{"type" => "private"} = meta} = message, user_id) do
    user_id in [message.user_id, meta["target_user_id"]]
  end

  defp can_react_to_message?(_message, _user_id), do: true

  defp own_message?(_message, nil), do: false
  defp own_message?(message, user_id), do: message.user_id == user_id

  defp can_send_message?(nil, _), do: true

  defp can_send_message?(user_id, state) do
    !Enum.member?(state.banned_user_ids, user_id)
  end

  defp chat_key(:lobby), do: :LOBBY_CHAT
  defp chat_key({type, id}), do: {:via, Registry, {Codebattle.Registry, "chat:#{type}:#{id}"}}
end
