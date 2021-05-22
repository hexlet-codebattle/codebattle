defmodule Codebattle.Chat.Server do
  use GenServer

  alias Codebattle.Tournament

  @admins Application.compile_env(:codebattle, :admins)
  @message_ttl 37 * 60
  @timeout :timer.minutes(1)

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
    broadcast_message(type, "chat:new_msg", message)
    :ok
  end

  def get_messages(type) do
    GenServer.call(chat_key(type), :get_messages)
  end

  def command(chat_type, user, %{type: command_type} = payload) do
    if is_admin?(user) do
      case {command_type, payload} do
        {"ban", %{name: banned_name}} ->
          ban_message = %{
            type: "info",
            name: "CB",
            time: payload.time,
            text: "#{banned_name} has been banned by #{user.name}"
          }

          GenServer.call(chat_key(chat_type), {:ban, %{name: banned_name, message: ban_message}})
          broadcast_message(chat_type, "chat:ban", %{name: banned_name})
          broadcast_message(chat_type, "chat:new_msg", ban_message)

        _ ->
          :ok
      end
    end
  end

  # SERVER
  def init(_) do
    Process.send_after(self(), :clean_messages, @timeout)
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

  def handle_call({:ban, %{name: name, message: message}}, _from, %{messages: messages} = state) do
    new_messages = Enum.filter(messages, fn message -> message.name != name end)

    {:reply, :ok, %{state | messages: [message | new_messages]}}
  end

  def handle_cast({:add_message, message}, state) do
    %{messages: messages} = state
    {:noreply, %{state | messages: [message | messages]}}
  end

  def handle_info(:clean_messages, %{messages: messages} = state) do
    new_messages =
      Enum.filter(
        messages,
        fn message ->
          message.time > :os.system_time(:seconds) - @message_ttl
        end
      )

    Process.send_after(self(), :clean_messages, @timeout)
    {:noreply, %{state | messages: new_messages}}
  end

  # Helpers
  defp chat_key(:lobby), do: :LOBBY_CHAT
  defp chat_key({type, id}), do: {:via, :gproc, {:n, :l, {:chat, "#{type}_#{id}"}}}

  defp broadcast_message(type, topic, message) do
    case type do
      :lobby ->
        CodebattleWeb.Endpoint.broadcast!(
          "chat:lobby",
          topic,
          message
        )

      {:tournament, id} ->
        CodebattleWeb.Endpoint.broadcast!(
          Tournament.Server.tournament_topic_name(id),
          topic,
          message
        )

        CodebattleWeb.Endpoint.broadcast!(
          "chat:t_#{id}",
          topic,
          message
        )

      {:game, id} ->
        CodebattleWeb.Endpoint.broadcast!(
          "chat:g_#{id}",
          topic,
          message
        )

      _ ->
        :ok
    end
  end

  defp is_admin?(user) do
    user.name in @admins || Mix.env() == :dev
  end
end
