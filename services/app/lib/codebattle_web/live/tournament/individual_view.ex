defmodule CodebattleWeb.Live.Tournament.IndividualView do
  use Phoenix.LiveView
  use Timex

  alias Codebattle.Tournament.Helpers

  # @update_frequency 1_000

  def render(assigns) do
    CodebattleWeb.TournamentView.render("individual.html", assigns)
  end

  def mount(session, socket) do
    tournament = session.tournament
    messages = Codebattle.Tournament.Server.get_messages(tournament.id)

    CodebattleWeb.Endpoint.subscribe(topic_name(tournament))

    {:ok,
     assign(socket,
       current_user: session[:current_user],
       tournament: tournament,
       messages: messages,
       starts_at: NaiveDateTime.to_string(tournament.starts_at)
     )}
  end

  def handle_info(%{topic: topic, event: "update_tournament", payload: payload}, socket) do
    if is_current_topic?(topic, socket.assigns.tournament) do
      {:noreply, assign(socket, tournament: payload.tournament)}
    else
      {:noreply, socket}
    end
  end

  def handle_info(%{topic: topic, event: "update_chat", payload: payload}, socket) do
    if is_current_topic?(topic, socket.assigns.tournament) do
      {:noreply, assign(socket, messages: payload.messages)}
    else
      {:noreply, socket}
    end
  end

  def handle_event("join", _params, socket) do
    new_tournament =
      Helpers.join(
        socket.assigns.tournament,
        socket.assigns.current_user
      )

    CodebattleWeb.Endpoint.broadcast_from(
      self(),
      topic_name(new_tournament),
      "update_tournament",
      %{
        tournament: new_tournament
      }
    )

    {:noreply, assign(socket, tournament: new_tournament)}
  end

  def handle_event("leave", _params, socket) do
    new_tournament =
      Helpers.leave(
        socket.assigns.tournament,
        socket.assigns.current_user
      )

    CodebattleWeb.Endpoint.broadcast_from(
      self(),
      topic_name(new_tournament),
      "update_tournament",
      %{
        tournament: new_tournament
      }
    )

    {:noreply, assign(socket, tournament: new_tournament)}
  end

  def handle_event("cancel", _params, socket) do
    new_tournament =
      Helpers.cancel!(
        socket.assigns.tournament,
        socket.assigns.current_user
      )

    CodebattleWeb.Endpoint.broadcast_from(
      self(),
      topic_name(new_tournament),
      "update_tournament",
      %{
        tournament: new_tournament
      }
    )

    {:stop,
     socket
     |> put_flash(:info, "Tournament cancel successfully.")
     |> redirect(to: "/tournaments")}
  end

  def handle_event("start", _params, socket) do
    new_tournament =
      Helpers.start!(
        socket.assigns.tournament,
        socket.assigns.current_user
      )

    CodebattleWeb.Endpoint.broadcast_from(
      self(),
      topic_name(new_tournament),
      "update_tournament",
      %{
        tournament: new_tournament
      }
    )

    {:noreply, assign(socket, tournament: new_tournament)}
  end

  # def handle_event("chat_message", %{"message" => %{"content" => ""}}, socket),
  #   do: {:noreply, socket}

  def handle_event("chat_message", params, socket) do
    tournament = socket.assigns.tournament
    current_user = socket.assigns.current_user

    Codebattle.Tournament.Server.add_message(
      tournament.id,
      current_user,
      params["message"]["content"]
    )

    messages = Codebattle.Tournament.Server.get_messages(tournament.id)

    CodebattleWeb.Endpoint.broadcast_from(
      self(),
      topic_name(tournament),
      "update_chat",
      %{messages: messages}
    )

    {:noreply, assign(socket, messages: messages)}
  end

  defp topic_name(tournament) do
    "tournament_#{tournament.id}"
  end

  defp is_current_topic?(topic, tournament) do
    topic == topic_name(tournament)
  end
end
