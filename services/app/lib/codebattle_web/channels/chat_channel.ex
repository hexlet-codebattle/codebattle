defmodule CodebattleWeb.ChatChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.{Chat, UsersActivityServer, GameProcess}

  def join(topic, _payload, socket) do
    type = get_chat_type(topic)
    {:ok, users} = Chat.Server.join_chat(type, socket.assigns.current_user)
    msgs = Chat.Server.get_msgs(type)
    send(self(), :after_join)
    {:ok, %{users: users, messages: msgs}, socket}
  end

  def handle_info(:after_join, socket) do
    {type, chat_id} = get_chat_type(socket)

    GameProcess.Server.update_playbook(
      chat_id,
      :join_chat,
      %{
        id: socket.assigns.current_user.id,
        name: socket.assigns.current_user.name
      }
    )

    users = Chat.Server.get_users({type, chat_id})
    broadcast_from!(socket, "chat:user_joined", %{users: users})
    {:noreply, socket}
  end

  def terminate(_reason, socket) do
    {type, chat_id} = get_chat_type(socket)
    {:ok, users} = Chat.Server.leave_chat({type, chat_id}, socket.assigns.current_user)

    GameProcess.Server.update_playbook(
      chat_id,
      :leave_chat,
      %{
        id: socket.assigns.current_user.id,
        name: socket.assigns.current_user.name
      }
    )

    broadcast_from!(socket, "chat:user_left", %{users: users})
    {:noreply, socket}
  end

  def handle_in("chat:new_msg", payload, socket) do
    %{"message" => message} = payload
    user = socket.assigns.current_user
    name = get_user_name(user)
    {type, chat_id} = get_chat_type(socket)

    Chat.Server.add_msg({type, chat_id}, name, message)

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

    {:noreply, socket}
  end

  defp get_user_name(%{is_bot: true, name: name}), do: "#{name} (bot)"
  defp get_user_name(%{name: name}), do: name

  defp get_chat_type(topic) when is_binary(topic) do
    case topic do
      "chat:g_" <> chat_id -> {:game, chat_id}
      "chat:t_" <> tournament_id -> {:tournament, tournament_id}
    end
  end

  defp get_chat_type(socket), do: get_chat_type(socket.topic)
end
