defmodule CodebattleWeb.ChatChannel do
    @moduledoc false
    use Codebattle.Web, :channel
  
    require Logger
  
    alias Codebattle.Chat.Server
  
    def join("chat:" <> chat_id, _payload, socket) do
        send(self(), :after_join)
        {:ok, users} = Server.join_chat(chat_id, socket.assigns.user_id)
        msgs = Server.get_msgs(chat_id)

        {:ok, %{users: users, msgs: msgs}, socket}
    end

    def handle_info(:after_join, socket) do
        chat_id = get_chat_id(socket)
        users = Server.get_users(chat_id)
        broadcast_from! socket, "user:joined", %{users: users}
        {:noreply, socket}
    end
    
    def terminate(_reason, socket) do
        chat_id = get_chat_id(socket)
        {:ok, users} = Server.leave_chat(chat_id, socket.assigns.user_id)
        broadcast_from! socket, "user:left", %{users: users}
        {:noreply, socket}
    end

    def handle_in("new:message", payload, socket) do
        %{"text" => message} = payload
        chat_id = get_chat_id(socket)
        Server.add_msg(chat_id, socket.assigns.user_id, message)
        broadcast_from! socket, "new:message", %{message: message}
        {:reply, :ok, socket}
    end

    defp get_chat_id(socket) do
        "chat:" <> chat_id = socket.topic
        chat_id
    end
  end
  