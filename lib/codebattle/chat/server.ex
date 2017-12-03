defmodule Codebattle.Chat.Server do
    @moduledoc false

    def start_link(id) do
        GenServer.start_link(__MODULE__, [], name: chat_key(id))
    end

    def get_users(id) do
        GenServer.call(chat_key(id), :get_users)
    end

    def join_chat(id, user) do
        GenServer.call(chat_key(id), {:join, user})
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
end