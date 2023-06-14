defmodule CodebattleWeb.ChatChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.Chat
  alias Codebattle.Game

  def join(topic, _payload, socket) do
    type = get_chat_type(topic)
    user_id = socket.assigns.current_user.id

    subscribe_to_updates(type)
    %{users: users, messages: messages} = Chat.join_chat(type, socket.assigns.current_user)

    filtered_messages = messages
      |> Enum.filter(fn message ->
        if message.meta && message.meta.type == "private" do
          message.user_id == user_id && message.meta.target_user_id == user_id
        else
          true
        end
      end)


    send(self(), :after_join)
    {:ok, %{users: users, messages: filtered_messages}, socket}
  end

  def handle_in("chat:add_msg", payload, socket) do
    text = payload["text"]
    meta = payload["meta"]
    user = socket.assigns.current_user
    chat_type = get_chat_type(socket)

    Chat.add_message(chat_type, %{
      user_id: user.id,
      name: user.name,
      type: :text,
      text: text,
      meta: meta
    })

    update_playbook(chat_type, :chat_message, %{id: user.id, name: user.name, message: text})

    {:noreply, socket}
  end

  def handle_in("chat:command", payload, socket) do
    chat_type = get_chat_type(socket)
    user = socket.assigns.current_user

    case payload["type"] do
      "ban" ->
        if Codebattle.User.admin?(user) do
          Chat.ban_user(chat_type, %{
            admin_name: user.name,
            name: payload["name"],
            user_id: payload["user_id"]
          })
        end

      "clean_banned" ->
        if Codebattle.User.admin?(user) do
          Chat.clean_banned(chat_type)
        end

      _ ->
        :ok
    end

    {:noreply, socket}
  end

  def handle_in(_, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info(:after_join, socket) do
    chat_type = get_chat_type(socket)

    update_playbook(chat_type, :join_chat, %{
      id: socket.assigns.current_user.id,
      name: socket.assigns.current_user.name
    })

    # TODO: broadcast just user_id
    users = Chat.get_users(chat_type)
    broadcast_from!(socket, "chat:user_joined", %{users: users})
    {:noreply, socket}
  end

  def handle_info(%{topic: _topic, event: "chat:new_msg", payload: payload}, socket) do
    user_id = socket.assigns.current_user.id
    if (payload.meta || (payload.user_id == user_id && payload.meta.target_user_id == user_id)) do
      push(socket, "chat:new_msg", payload)
    end

    {:noreply, socket}
  end

  def handle_info(%{topic: _topic, event: "chat:user_banned", payload: payload}, socket) do
    push(socket, "chat:user_banned", payload)

    {:noreply, socket}
  end

  def handle_info(_, socket), do: {:noreply, socket}

  def terminate(_reason, socket) do
    chat_type = get_chat_type(socket)
    users = Chat.leave_chat(chat_type, socket.assigns.current_user)

    update_playbook(chat_type, :leave_chat, %{
      id: socket.assigns.current_user.id,
      name: socket.assigns.current_user.name
    })

    # TODO: broadcast just user_id
    broadcast_from!(socket, "chat:user_left", %{users: users})
    {:noreply, socket}
  end

  defp get_chat_type(topic) when is_binary(topic) do
    case topic do
      "chat:lobby" -> :lobby
      "chat:g_" <> chat_id -> {:game, chat_id}
      "chat:t_" <> tournament_id -> {:tournament, tournament_id}
    end
  end

  defp get_chat_type(socket), do: get_chat_type(socket.topic)

  defp update_playbook(:lobby, _event_name, _payload), do: :noop

  defp update_playbook({_type, chat_id}, event_name, payload) do
    Game.Server.update_playbook(chat_id, event_name, payload)
  end

  defp subscribe_to_updates(:lobby), do: Codebattle.PubSub.subscribe("chat:lobby")
  defp subscribe_to_updates({:game, id}), do: Codebattle.PubSub.subscribe("chat:game:#{id}")

  defp subscribe_to_updates({:tournament, id}) do
    Codebattle.PubSub.subscribe("chat:tournament:#{id}")
  end
end
