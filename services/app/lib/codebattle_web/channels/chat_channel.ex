defmodule CodebattleWeb.ChatChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.{Chat, UsersActivityServer, Game}

  def join(topic, _payload, socket) do
    type = get_chat_type(topic)
    {:ok, users} = Chat.Server.join_chat(type, socket.assigns.current_user)
    msgs = Chat.Server.get_messages(type)
    send(self(), :after_join)
    {:ok, %{users: users, messages: msgs}, socket}
  end

  def handle_info(:after_join, socket) do
    chat_type = get_chat_type(socket)

    update_paybook(chat_type, :join_chat, %{
      id: socket.assigns.current_user.id,
      name: socket.assigns.current_user.name
    })

    users = Chat.Server.get_users(chat_type)
    broadcast_from!(socket, "chat:user_joined", %{users: users})
    {:noreply, socket}
  end

  def terminate(_reason, socket) do
    chat_type = get_chat_type(socket)
    {:ok, users} = Chat.Server.leave_chat(chat_type, socket.assigns.current_user)

    update_paybook(chat_type, :leave_chat, %{
      id: socket.assigns.current_user.id,
      name: socket.assigns.current_user.name
    })

    broadcast_from!(socket, "chat:user_left", %{users: users})
    {:noreply, socket}
  end

  def handle_in("chat:command", %{"command" => payload}, socket) do
    chat_type = get_chat_type(socket)

    if Codebattle.User.is_admin?(socket.assigns.current_user) do
      Chat.Server.command(chat_type, socket.assigns.current_user, %{
        type: payload["type"],
        name: payload["name"],
        time: :os.system_time(:seconds)
      })
    end

    {:noreply, socket}
  end

  def handle_in("chat:new_msg", payload, socket) do
    text = payload["text"] || payload[:text]
    user = socket.assigns.current_user
    name = get_user_name(user)
    chat_type = get_chat_type(socket)

    Chat.Server.add_message(chat_type, %{name: name, text: text, time: :os.system_time(:seconds)})

    update_paybook(chat_type, :chat_message, %{
      id: user.id,
      name: name,
      message: text
    })

    {:noreply, socket}
  end

  def handle_in(_, _payload, socket) do
    {:noreply, socket}
  end

  defp get_user_name(%{is_bot: true, name: name}), do: "#{name}(bot)"
  defp get_user_name(%{name: name}), do: name

  defp get_chat_type(topic) when is_binary(topic) do
    case topic do
      "chat:lobby" -> :lobby
      "chat:g_" <> chat_id -> {:game, chat_id}
      "chat:t_" <> tournament_id -> {:tournament, tournament_id}
    end
  end

  defp get_chat_type(socket), do: get_chat_type(socket.topic)

  defp update_paybook(:lobby, _event_name, _payload), do: :ok

  defp update_paybook({_type, chat_id}, event_name, payload) do
    if event_name == :chat_message do
      UsersActivityServer.add_event(%{
        event: "new_message_game",
        user_id: payload.id,
        data: %{
          game_id: chat_id
        }
      })
    end

    Game.Server.update_playbook(chat_id, event_name, payload)
  end
end
