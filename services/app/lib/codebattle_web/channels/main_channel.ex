defmodule CodebattleWeb.MainChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias CodebattleWeb.Presence
  alias Codebattle.Invite

  def join("main:" <> user_id, _payload, socket) do
    if String.to_integer(user_id) != socket.assigns.user_id do
      raise "Not authorized!"
    end

    send(self(), :after_join)

    {:ok, %{}, socket}
  end

  # TODO: add pubsub message handlers for invites:
  #   "invites:created" (a Controller can also create a invite)
  #   "invites:expired"
  #
  # By socket.assigns.current_user we choose notify or not
  #
  # PubSub events handler
  #
  # def handle_info(%{topic: "main", event: event, payload: payload}, socket) do
  #   {:noreply, socket}
  # end
  #
  # TODO: add socket message handlers for invites:
  #   "invites:create" -{ push message back }> "invites:created", "invites:already_have_one"
  #   "invites:cancel" -> "invites:canceled", "invites:already_expired", "invites:not_exists"
  #   "invites:apply" -> "invites:applied", "invites:already_expired", "invites:not_exists"
  #   "invites:decline" -> "invites:canceled", "invites:already_expired", "invites:not_exists"

  def handle_info(:after_join, socket) do
    # {:ok, _} =
    #  Presence.track(socket, socket.assigns.user_id, %{
    #    online_at: inspect(System.system_time(:second)),
    #    user: socket.assigns.current_user,
    #    id: socket.assigns.user_id,
    #  })

    # push(socket, "presence_state", Presence.list(socket))

    # TODO: Create Invite model
    invites = Invite.list_active_invites(socket.assigns.user_id)
    push(socket, "invites:init", %{invites: invites})
    {:noreply, socket}
  end

  def handle_in("invites:create", payload, socket) do
    creator_id = socket.assigns.user_id
    recepient_id = payload["recepient_id"] || raise "Recepient is absent!"

    if creator_id == recepient_id do
      raise "Creator can't be recepient!"
    end

    level = payload["level"] || "elementary"
    type = payload["type"] || "public"

    game_params = %{
      level: level,
      type: type
    }

    params = %{creator_id: creator_id, recepient_id: recepient_id, game_params: game_params}

    case Invite.create_invite(params) do
      {:ok, invite} ->
        CodebattleWeb.Endpoint.broadcast!(
          "main:#{recepient_id}",
          "invites:created",
          %{invite: invite}
        )

        {:reply, {:ok, %{invite: invite}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("invites:cancel", payload, socket) do
    user_id = socket.assigns.user_id

    case Invite.cancel_invite(%{
           id: payload["id"],
           user_id: user_id
         }) do
      {:ok, invite} ->
        socket_channel =
          if user_id == invite.creator_id,
            do: "main:#{invite.recepient_id}",
            else: "main:#{invite.creator_id}"

        CodebattleWeb.Endpoint.broadcast!(
          socket_channel,
          "invites:cancelled",
          %{invite: invite}
        )

        {:reply, {:ok, %{invite: invite}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("invites:accept", payload, socket) do
    case Invite.accept_invite(%{
           id: payload["id"],
           recepient_id: socket.assigns.user_id
         }) do
      {:ok, invite} ->
        CodebattleWeb.Endpoint.broadcast!(
          "main:#{invite.creator_id}",
          "invites:accepted",
          %{invite: invite}
        )

        {:reply, {:ok, %{invite: invite}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end
end
