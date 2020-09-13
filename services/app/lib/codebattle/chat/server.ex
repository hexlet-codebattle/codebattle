defmodule Codebattle.Chat.Server do
  use GenServer

  alias Codebattle.Tournament

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

  def add_msg(type, user_name, msg) do
    GenServer.cast(chat_key(type), {:add_msg, user_name, msg})

    case type do
      {:tournament, id} ->
        CodebattleWeb.Endpoint.broadcast!(
          Tournament.Server.tournament_topic_name(id),
          "chat:new_msg",
          %{user_name: user_name, message: msg}
        )

        CodebattleWeb.Endpoint.broadcast!(
          "chat:t_#{id}",
          "chat:new_msg",
          %{user_name: user_name, message: msg}
        )

      {:game, id} ->
        CodebattleWeb.Endpoint.broadcast!(
          "chat:g_#{id}",
          "chat:new_msg",
          %{user_name: user_name, message: msg}
        )

        nil
    end
  end

  def get_msgs(type) do
    GenServer.call(chat_key(type), :get_msgs)
  end

  defp chat_key({type, id}) do
    {:via, :gproc, {:n, :l, {:chat, "#{type}_#{id}"}}}
  end

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

  def handle_call(:get_msgs, _from, state) do
    %{messages: messages} = state
    {:reply, Enum.reverse(messages), state}
  end

  def handle_cast({:add_msg, user_name, msg}, state) do
    %{messages: messages} = state
    new_msgs = [%{user_name: user_name, message: msg} | messages]
    {:noreply, %{state | messages: new_msgs}}
  end
end
