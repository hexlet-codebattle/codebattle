defmodule CodebattleWeb.ChatChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.{Chat, UsersActivityServer, GameProcess}

  def join("chat:" <> chat_id, _payload, socket) do
    send(self(), :after_join)
    {:ok, users} = Chat.Server.join_chat(chat_id, socket.assigns.current_user)

    GameProcess.Server.update_playbook(
      chat_id,
      :join_chat,
      %{
        id: socket.assigns.current_user.id,
        name: socket.assigns.current_user.name
      }
    )

    msgs = Chat.Server.get_msgs(chat_id)

    {:ok, %{users: users, messages: msgs}, socket}
  end

  def handle_info(:after_join, socket) do
    chat_id = get_chat_id(socket)
    users = Chat.Server.get_users(chat_id)
    broadcast_from!(socket, "user:joined", %{users: users})
    {:noreply, socket}
  end

  def terminate(_reason, socket) do
    chat_id = get_chat_id(socket)
    {:ok, users} = Chat.Server.leave_chat(chat_id, socket.assigns.current_user)

    GameProcess.Server.update_playbook(
      chat_id,
      :leave_chat,
      %{
        id: socket.assigns.current_user.id,
        name: socket.assigns.current_user.name
      }
    )

    broadcast_from!(socket, "user:left", %{users: users})
    {:noreply, socket}
  end

  def handle_in("new:message", payload, socket) do
    %{"message" => message} = payload
    user = socket.assigns.current_user
    name = get_user_name(user)
    chat_id = get_chat_id(socket)

    Chat.Server.add_msg(chat_id, name, message)

    UsersActivityServer.add_event(%{
      event: "new_message_game",
      user_id: user.id,
      data: %{
        game_id: chat_id
      }
    })

    GameProcess.Server.update_playbook(
      chat_id,
      :chat_message,
      %{
        id: user.id,
        name: name,
        message: message
      }
    )

    broadcast!(socket, "new:message", %{user: name, message: message})
    {:noreply, socket}
  end

  defp get_user_name(%{is_bot: true, name: name}), do: "#{name} (bot)"
  defp get_user_name(%{name: name}), do: name

  defp get_chat_id(socket) do
    "chat:" <> chat_id = socket.topic
    chat_id
  end
end
