defmodule CodebattleWeb.InviteChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.Invite

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

  def handle_info(%{topic: "invites:" <> _user_id, event: "invites:" <> action, payload: payload}, socket) do
    push(socket, "invites:#{action}", payload)
    {:noreply, socket}
  end

  def handle_in("invites:create", payload, socket) do
    params = %{
      recipient_id: payload["recipient_id"],
      level: payload["level"],
      timeout_seconds: Codebattle.Game.Context.cast_user_timeout_seconds(payload["timeout_seconds"]),
      task_id: payload["task_id"]
    }

    case Invite.Actions.create(socket.assigns.current_user, params) do
      {:ok, invite} -> {:reply, {:ok, %{invite: invite}}, socket}
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("invites:cancel", payload, socket) do
    user = socket.assigns.current_user

    case Invite.Actions.cancel(payload["id"], user) do
      {:ok, invite} -> {:reply, {:ok, Invite.Actions.payload(invite, user.id)}, socket}
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("invites:accept", payload, socket) do
    user = socket.assigns.current_user

    case Invite.Actions.accept(payload["id"], user) do
      {:ok, invite} ->
        {:reply, {:ok, Invite.Actions.payload(invite, user.id)}, socket}

      {:error, reason, invite} ->
        {:reply, {:error, Map.put(Invite.Actions.payload(invite, user.id), :reason, reason)}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in(_topic, _payload, socket) do
    {:noreply, socket}
  end
end
