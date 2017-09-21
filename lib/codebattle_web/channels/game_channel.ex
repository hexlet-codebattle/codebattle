defmodule CodebattleWeb.GameChannel do
  @moduledoc false
  use Codebattle.Web, :channel

  require Logger

  alias Codebattle.GameProcess.{Play, Fsm}
  alias CodebattleWeb.Presence

  def join("game:" <> game_id, _payload, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("editor:data", payload, socket) do
    data = Map.get(payload, "data")
    "game:" <> game_id = socket.topic
    Play.update_data(game_id, socket.assigns.user_id, data)
    {:reply, {:ok, payload}, socket}
    #     broadcast! socket, "response:updated", %{challenge: challenge}
    #     {:noreply, socket}
    #   {:error, changeset} ->
    #     {:reply, {:error, %{error: "Error updating challenge"}}, socket}
    #   {:error, error} ->
    # end
  end

  def handle_info(:after_join, socket) do
    user = %{name: "test"}
    {:ok, _} = Presence.track(socket, user.name, %{
      online_at: inspect(System.system_time(:seconds))
    })
    push socket, "presence_state", Presence.list(socket)
    {:noreply, socket}
  end
end
