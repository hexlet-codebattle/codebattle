defmodule CodebattleWeb.InviteChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.{Invite, User}
  alias Codebattle.PubSub.Message

  def join("invites", _payload, socket) do
    current_user = socket.assigns.current_user

    if !current_user.is_guest do
      topic = "invites:#{current_user.id}"
      Codebattle.PubSub.subscribe(topic)
      send(self(), :after_join)
    end

    {:ok, %{}, socket}
  end

  def handle_info(:after_join, socket) do
    invites = Invite.list_active_invites(socket.assigns.current_user.id)
    push(socket, "invites:init", %{invites: invites})
    {:noreply, socket}
  end

  def handle_info(
        %{topic: "invites:" <> _user_id, event: "invites:" <> action, payload: payload},
        socket
      ) do
    push(socket, "invites:#{action}", payload)
    {:noreply, socket}
  end

  def handle_in("invites:create", payload, socket) do
    creator_id = socket.assigns.current_user.id
    recipient_id = payload["recipient_id"] || raise "recipient is absent!"

    if creator_id == recipient_id || User.bot?(recipient_id) do
      raise "Incorrect user for invite!"
    end

    if Invite.has_pending_invites?(creator_id, recipient_id) do
      raise "Invite already created!"
    end

    level = payload["level"] || "elementary"
    type = "public"
    timeout_seconds = payload["timeout_seconds"] || 3600
    task_id = payload["task_id"] || nil

    game_params = %{
      level: level,
      type: type,
      timeout_seconds: timeout_seconds
    }

    reply =
      create_invite(%{
        creator_id: creator_id,
        recipient_id: recipient_id,
        game_params: game_params,
        task_id: task_id
      })

    {:reply, reply, socket}
  end

  def handle_in("invites:cancel", payload, socket) do
    user_id = socket.assigns.current_user.id

    case Invite.cancel_invite(%{
           id: payload["id"],
           user_id: user_id
         }) do
      {:ok, invite} ->
        data = %{
          state: invite.state,
          id: invite.id,
          game_params: invite.game_params,
          creator_id: invite.creator_id,
          recipient_id: invite.recipient_id,
          executor_id: user_id,
          creator: invite.creator,
          recipient: invite.recipient
        }

        broadcast_invite(
          "invites:#{invite.creator_id}",
          "invites:canceled",
          %{invite: data}
        )

        broadcast_invite(
          "invites:#{invite.recipient_id}",
          "invites:canceled",
          %{invite: data}
        )

        {:reply, {:ok, %{invite: data}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("invites:accept", payload, socket) do
    user_id = socket.assigns.current_user.id

    case Invite.accept_invite(%{
           id: payload["id"],
           recipient_id: user_id
         }) do
      {:ok, %{invite: invite, dropped_invites: dropped_invites}} ->
        data = %{
          state: invite.state,
          id: invite.id,
          game_id: invite.game_id,
          game_params: invite.game_params,
          creator_id: invite.creator_id,
          recipient_id: invite.recipient_id,
          executor_id: user_id,
          creator: invite.creator,
          recipient: invite.recipient
        }

        broadcast_invite(
          "invites:#{invite.creator_id}",
          "invites:accepted",
          %{invite: data}
        )

        broadcast_invite(
          "invites:#{invite.recipient_id}",
          "invites:accepted",
          %{invite: data}
        )

        Enum.each(dropped_invites, fn invite ->
          data = %{
            state: invite.state,
            id: invite.id
          }

          broadcast_invite(
            "invites:#{invite.creator_id}",
            "invites:dropped",
            %{invite: data}
          )

          broadcast_invite(
            "invites:#{invite.recipient_id}",
            "invites:dropped",
            %{invite: data}
          )
        end)

        {:reply, {:ok, %{invite: data}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  defp create_invite(params) do
    case Invite.create_invite(params) do
      {:ok, invite} ->
        data = %{
          state: invite.state,
          id: invite.id,
          game_params: params.game_params,
          creator_id: invite.creator_id,
          recipient_id: invite.recipient_id,
          executor_id: invite.creator_id,
          creator: invite.creator,
          recipient: invite.recipient
        }

        broadcast_invite(
          "invites:#{invite.creator_id}",
          "invites:created",
          %{invite: data}
        )

        broadcast_invite(
          "invites:#{invite.recipient_id}",
          "invites:created",
          %{invite: data}
        )

        {:ok, %{invite: invite}}

      {:error, reason} ->
        {:error, %{reason: reason}}
    end
  end

  defp broadcast_invite(topic, event, payload) do
    message = %Message{
      topic: topic,
      event: event,
      payload: payload
    }

    Phoenix.PubSub.broadcast(Codebattle.PubSub, topic, message)
  end
end
