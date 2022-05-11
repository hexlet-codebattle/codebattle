defmodule Codebattle.Chat.Server do
  use GenServer

  alias Codebattle.Tournament

  @message_ttl 60 * 60
  @timeout :timer.minutes(1)

  # API
  def start_link(chat_type) do
    GenServer.start_link(__MODULE__, [], name: chat_key(chat_type))
  end

  def join_chat(chat_type, user) do
    try do
      GenServer.call(chat_key(chat_type), {:join, user})
    catch
      :exit, _reason ->
        # TODO: add error handler
        {:ok, []}
    end
  end

  def leave_chat(chat_type, user) do
    try do
      GenServer.call(chat_key(chat_type), {:leave, user})
    catch
      :exit, _reason ->
        {:ok, []}
    end
  end

  def get_users(chat_type) do
    try do
      GenServer.call(chat_key(chat_type), :get_users)
    catch
      :exit, _reason ->
        []
    end
  end

  def add_message(chat_type, message) do
    GenServer.call(chat_key(chat_type), {:add_message, message})

    Codebattle.PubSub.broadcast("chat:new_msg", %{
      # types: :lobby | {:tournament, 1} | {:game, 1}
      type: chat_type,
      name: message.name,
      text: message.text,
      time: message.time
    })

    :ok
  end

  def get_messages(chat_type) do
    try do
      GenServer.call(chat_key(chat_type), :get_messages)
    catch
      :exit, _reason ->
        # TODO: add dead message
        []
    end
  end

  def command(chat_type, user, %{type: "ban"} = payload) do
    ban_message = %{
      type: "info",
      name: "CB",
      time: payload.time,
      text: "#{payload.name} has been banned by #{user.name}"
    }

    GenServer.call(chat_key(chat_type), {:ban, %{name: banned_name, message: ban_message}})

    Codebattle.PubSub.broadcast("chat:command:ban", %{
      type: chat_type,
      name: message.name,
      text: message.text,
      time: message.time
    })

    Codebattle.PubSub.broadcast("chat:new_msg", %{
      type: chat_type,
      name: ban_message.name,
      text: ban_message.text,
      time: ban_message.time
    })
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

    {rest_users, found_users} = Enum.split_with(users, fn u -> u != user end)
    new_users = found_users |> Enum.drop(1) |> Enum.concat(rest_users)

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

    {:reply, :ok, %{state | messages: new_messages}}
  end

  def handle_call({:add_message, message}, _from, state) do
    %{messages: messages} = state
    {:noreply, :ok, %{state | messages: [message | messages]}}
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

  # defp broadcast_message(type, topic, message) do
  #   case type do
  #     :lobby ->
  #       CodebattleWeb.Endpoint.broadcast!(
  #         "chat:lobby",
  #         topic,
  #         message
  #       )

  #     {:tournament, id} ->
  #       CodebattleWeb.Endpoint.broadcast!(
  #         Tournament.Server.tournament_topic_name(id),
  #         topic,
  #         message
  #       )

  #       CodebattleWeb.Endpoint.broadcast!(
  #         "chat:t_#{id}",
  #         topic,
  #         message
  #       )

  #     {:game, id} ->
  #       CodebattleWeb.Endpoint.broadcast!(
  #         "chat:g_#{id}",
  #         topic,
  #         message
  #       )

  #     _ ->
  #       :ok
  #   end
  # end
end
