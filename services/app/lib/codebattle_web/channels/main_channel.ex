defmodule CodebattleWeb.MainChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias CodebattleWeb.Presence
  alias Codebattle.Invite

  def join("main", _payload, socket) do
    current_user = socket.assigns.current_user

    if !current_user.guest do
      topic = "main:#{current_user.id}"
      Phoenix.PubSub.subscribe(:cb_pubsub, topic)
      send(self(), :after_join)
    end

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
    {:ok, _} =
      Presence.track(socket, socket.assigns.current_user.id, %{
        online_at: inspect(System.system_time(:second)),
        user: socket.assigns.current_user,
        id: socket.assigns.current_user.id
      })

    push(socket, "presence_state", Presence.list(socket))

    # TODO: Create Invite model
    invites = Invite.list_active_invites(socket.assigns.current_user.id)
    push(socket, "invites:init", %{invites: invites})
    {:noreply, socket}
  end

  def handle_info(
        %{topic: "main:" <> user_id, event: "invites:" <> action, payload: payload},
        socket
      ) do
    if String.to_integer(user_id) == socket.assigns.current_user.id do
      push(socket, "invites:#{action}", payload)
    end

    {:noreply, socket}
  end

  def handle_in("invites:create", payload, socket) do
    creator_id = socket.assigns.current_user.id
    recepient_id = payload["recepient_id"] || raise "Recepient is absent!"

    if creator_id == recepient_id do
      raise "Creator can't be recepient!"
    end

    level = payload["level"] || "elementary"
    type = "public"
    timeout_seconds = payload["timeout_seconds"] || 3600

    game_params = %{
      level: level,
      type: type,
      timeout_seconds: timeout_seconds
    }

    params = %{creator_id: creator_id, recepient_id: recepient_id, game_params: game_params}

    case Invite.create_invite(params) do
      {:ok, invite} ->
        data = %{
          state: invite.state,
          id: invite.id,
          creator_id: invite.creator_id,
          game_params: game_params,
          recepient_id: invite.recepient_id,
          creator: invite.creator,
          recepient: invite.recepient
        }

        CodebattleWeb.Endpoint.broadcast!(
          "main:#{recepient_id}",
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
          recepient_id: invite.recepient_id
        }

        topic =
          if user_id == invite.creator_id,
            do: "main:#{invite.recepient_id}",
            else: "main:#{invite.creator_id}"

        CodebattleWeb.Endpoint.broadcast!(
          topic,
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
           recepient_id: socket.assigns.current_user.id
         }) do
      {:ok, %{invite: invite, dropped_invites: dropped_invites}} ->
        data = %{
          state: invite.state,
          id: invite.id,
          creator_id: invite.creator_id,
          recepient_id: invite.recepient_id,
          game_id: invite.game_id
        }

        CodebattleWeb.Endpoint.broadcast!(
          "main:#{invite.creator_id}",
          "invites:accepted",
          %{invite: data}
        )

        Enum.each(dropped_invites, fn invite ->
          data = %{
            state: invite.state,
            id: invite.id
          }

          CodebattleWeb.Endpoint.broadcast!(
            "main:#{invite.recepient_id}",
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
