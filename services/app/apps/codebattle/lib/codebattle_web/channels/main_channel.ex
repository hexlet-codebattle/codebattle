defmodule CodebattleWeb.MainChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias CodebattleWeb.Presence

  def join("main", %{"state" => state}, socket) do
    current_user = socket.assigns.current_user

    if !current_user.is_guest do
      topic = "main:#{current_user.id}"
      Codebattle.PubSub.subscribe(topic)

      if Application.get_env(:codebattle, :use_presence) do
        send(self(), {:after_join, state})
      end
    end

    {:ok, %{}, socket}
  end

  def handle_info({:after_join, state}, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.current_user.id, %{
        online_at: inspect(System.system_time(:second)),
        state: state,
        user: socket.assigns.current_user,
        id: socket.assigns.current_user.id
      })

    push(socket, "presence_state", Presence.list(socket))

    {:noreply, socket}
  end
end
