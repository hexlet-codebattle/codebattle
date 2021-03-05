defmodule CodebattleWeb.MainChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias CodebattleWeb.Presence

  def join("online_list", _payload, socket) do
    user_id = socket.assigns.user_id
    Phoenix.PubSub.subscribe(:cb_pubsub, "main")
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
    {:ok, _} =
      Presence.track(socket, socket.assigns.user_id, %{
        online_at: inspect(System.system_time(:second)),
        user: socket.assigns.current_user,
        id: socket.assigns.user_id,
      })

    push(socket, "presence_state", Presence.list(socket))

    # TODO: Create Invite model
    ## invites = Invite.get_all_active()
    # push(socket, "invites:init", invites)
    {:noreply, socket}
  end
end
