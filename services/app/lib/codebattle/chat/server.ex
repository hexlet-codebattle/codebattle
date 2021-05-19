defmodule Codebattle.Chat.Server do
  use GenServer

  alias Codebattle.Tournament

  # API
  def start_link(type) do
    GenServer.start_link(__MODULE__, [], name: chat_key(type))
  end

  def join_chat(type, user) do
    try do
      GenServer.call(chat_key(type), {:join, user})
    catch
      :exit, _reason ->
        # TODO: add error handler
        {:ok, []}
    end
  end

  def leave_chat(type, user) do
    try do
      GenServer.call(chat_key(type), {:leave, user})
    catch
      :exit, _reason ->
        {:ok, []}
    end
  end

  def get_users(type) do
    GenServer.call(chat_key(type), :get_users)
  end

  def add_message(type, message) do
    GenServer.cast(chat_key(type), {:add_message, message})
    # TODO: use PubSup instead of direct broadcast
    broadcast_message(type, message)
    :ok
  end

  def get_messages(type) do
    GenServer.call(chat_key(type), :get_messages)
  end

  def command(chat_type, %{type: command_type} = command) do
    case command_type do
      "ban" ->
        GenServer.cast(chat_key(type), {:ban, %{user_id: user.id}})

        broadcast_message(chat_type, %{
          type: :info,
          name: command.name,
          text: "User #{command.banned_name} was banned"
        })
    end
  end

  # SERVER
  def init(_) do
    {:ok, %{users: [], messages: []}}
  end

  def handle_call({:join, user}, _from, state) do
    %{users: users} = state

    new_users = [user | users]

    {:reply, {:ok, new_users}, %{state | users: new_users}}
  end

  def handle_call({:leave, user}, _from, state) do
    %{users: users} = state

    {rest_users, finded_users} = Enum.split_with(users, fn u -> u != user end)
    new_users = finded_users |> Enum.drop(1) |> Enum.concat(rest_users)

    {:reply, {:ok, new_users}, %{state | users: new_users}}
  end

  def handle_call(:get_users, _from, state) do
    %{users: users} = state
    {:reply, users, state}
  end

  def handle_call(:get_messages, _from, state) do
    %{messages: messages} = state
    {:reply, Enum.reverse(messages), state}
  end

  def handle_cast({:add_message, message}, state) do
    %{messages: messages} = state
    {:noreply, %{state | messages: [message | messages]}}
  end

  # Helpers
  defp chat_key(:lobby), do: :LOBBY_CHAT
  defp chat_key({type, id}), do: {:via, :gproc, {:n, :l, {:chat, "#{type}_#{id}"}}}

  defp broadcast_message(type, message) do
    case type do
      {:tournament, id} ->
        CodebattleWeb.Endpoint.broadcast!(
          Tournament.Server.tournament_topic_name(id),
          "chat:new_msg",
          message
        )

        CodebattleWeb.Endpoint.broadcast!(
          "chat:t_#{id}",
          "chat:new_msg",
          message
        )

      {:game, id} ->
        CodebattleWeb.Endpoint.broadcast!(
          "chat:g_#{id}",
          "chat:new_msg",
          message
        )

      _ ->
        :ok
    end
  end
end
