defmodule CodebattleWeb.InviteChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.{Invite, User}

  def join("invites", _payload, socket) do
    current_user = socket.assigns.current_user

    if !current_user.is_guest do
      topic = "invites:#{current_user.id}"
      Codebattle.PubSub.subscribe(topic)
      send(self(), :after_join)
    end

    {:ok, %{}, socket}
  end

  # TODO: add pubsub message handlers for invites:
  #   "invites:created" (a Controller can also create a invite)
  #   "invites:expired"
  #
  # TODO: add socket message handlers for invites:
  #   "invites:create" -{ push message back }> "invites:created", "invites:already_have_one"
  #   "invites:cancel" -> "invites:canceled", "invites:already_expired", "invites:not_exists"
  #   "invites:apply" -> "invites:applied", "invites:already_expired", "invites:not_exists"
  #   "invites:decline" -> "invites:canceled", "invites:already_expired", "invites:not_exists"

  def handle_info(:after_join, socket) do
    invites = Invite.list_active_invites(socket.assigns.current_user.id)
    push(socket, "invites:init", %{invites: invites})
    {:noreply, socket}
  end

  def handle_info(
        %{topic: "invites:" <> user_id, event: "invites:" <> action, payload: payload},
        socket
      ) do
    if String.to_integer(user_id) == socket.assigns.current_user.id do
      push(socket, "invites:#{action}", payload)
    end

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

    game_params = %{
      level: level,
      type: type,
      timeout_seconds: timeout_seconds
    }

    params = %{creator_id: creator_id, recipient_id: recipient_id, game_params: game_params}


    case Invite.create_invite(params) do
      {:ok, invite} ->
        data = %{
          state: invite.state,
          id: invite.id,
          creator_id: invite.creator_id,
          game_params: game_params,
          recipient_id: invite.recipient_id,
          creator: invite.creator,
          recipient: invite.recipient
        }

        CodebattleWeb.Endpoint.broadcast!(
          "invites",
          "invites:created",
          %{invite: data}
        )

        {:reply, {:ok, %{invite: data}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
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
          creator_id: invite.creator_id,
          recipient_id: invite.recipient_id
        }

        CodebattleWeb.Endpoint.broadcast!(
          "invites",
          "invites:canceled",
          %{invite: data}
        )

        {:reply, {:ok, %{invite: data}}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("invites:accept", payload, socket) do
    case Invite.accept_invite(%{
           id: payload["id"],
           recipient_id: socket.assigns.current_user.id
         }) do
      {:ok, %{invite: invite, dropped_invites: dropped_invites}} ->
        data = %{
          state: invite.state,
          id: invite.id,
          creator_id: invite.creator_id,
          recipient_id: invite.recipient_id,
          game_id: invite.game_id
        }

        CodebattleWeb.Endpoint.broadcast!(
          "invites:#{invite.creator_id}",
          "invites:accepted",
          %{invite: data}
        )

        Enum.each(dropped_invites, fn invite ->
          data = %{
            state: invite.state,
            id: invite.id
          }

          CodebattleWeb.Endpoint.broadcast!(
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
end
