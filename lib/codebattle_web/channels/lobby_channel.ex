defmodule CodebattleWeb.LobbyChannel do
  @moduledoc false
  use Codebattle.Web, :channel
  alias Codebattle.Repo
  alias CodebattleWeb.User
  alias CodebattleWeb.Presence

  def join("lobby", _payload, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  def handle_in("message:new", payload, socket) do
    user = Repo.get(User, socket.assigns.user_id)
    broadcast! socket, "message:new", %{user: user.name,
                                        message: payload["message"]}
    {:noreply, socket}
  end

  def handle_info(:after_join, socket) do
    user = Repo.get(User, socket.assigns.user_id)
    {:ok, _} = Presence.track(socket, user.name, %{
      online_at: inspect(System.system_time(:seconds))
      })
    push socket, "presence_state", Presence.list(socket)
    {:noreply, socket}
  end
end
