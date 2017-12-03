defmodule Codebattle.Chat.Server do
    @moduledoc false

    def start_link(id) do
        GenServer.start_link(__MODULE__, [], name: chat_key(id))
    end

    def join_chat(id, user) do
        GenServer.call(chat_key(id), {:join, user})
    end

    def get_users(id) do
        GenServer.call(chat_key(id), :get_users)
    end

    def add_msg(id, user, msg) do
        GenServer.cast(chat_key(id), {:add_msg, user, msg})
    end

    def get_msgs(id) do
        GenServer.call(chat_key(id), :get_msgs)
    end

    defp chat_key(id) do
        {:via, :gproc, {:n, :l, {:chat, to_charlist(id)}}}
    end

    def init(_) do
        {:ok, %{users: [], msgs: []}}
    end

    def handle_call({:join, user}, _from, state) do
        %{users: users} = state
        new_users = [user | users]
        {:reply, :ok, %{state | users: new_users}}
    end

    def handle_call(:get_users, _from, state) do
        %{users: users} = state
        {:reply, users, state}
    end

    def handle_call(:get_msgs, _from, state) do
        %{msgs: msgs} = state
        {:reply, msgs, state}
    end

    def handle_cast({:add_msg, user, msg}, state) do
        %{msgs: msgs} = state
        new_msgs = [{user, msg} | msgs]
        {:noreply, %{state | msgs: new_msgs}}
    end
end
