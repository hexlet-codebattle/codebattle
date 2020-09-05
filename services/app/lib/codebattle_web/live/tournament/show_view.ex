defmodule CodebattleWeb.Live.Tournament.ShowView do
  use Phoenix.LiveView
  use Timex

  alias Codebattle.Tournament

  @update_frequency 1_000

  def render(assigns) do
    CodebattleWeb.TournamentView.render("#{assigns.tournament.type}.html", assigns)
  end

  def mount(_params, session, socket) do
    if connected?(socket) do
      :timer.send_interval(@update_frequency, self(), :update_time)
    end

    tournament = session["tournament"]
    messages = Tournament.Server.get_messages(tournament.id)

    Phoenix.PubSub.subscribe(:cb_pubsub, topic_name(tournament))

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       tournament: tournament,
       messages: messages,
       time: get_next_round_time(tournament)
     )}
  end

  def handle_info(:update_time, socket) do
    tournament = socket.assigns.tournament
    time = get_next_round_time(tournament)

    if tournament.state in ["waiting_participants", "active"] and time.seconds >= 0 do
      {:noreply, assign(socket, time: time)}
    else
      {:noreply, socket}
    end
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

  def handle_event("join", %{"team_id" => team_id}, socket) do
    Tournament.Server.update_tournament(socket.assigns.tournament.id, :join, %{
      user: socket.assigns.current_user,
      team_id: String.to_integer(team_id)
    })

    {:noreply, socket}
  end

  def handle_event("join", _params, socket) do
    Tournament.Server.update_tournament(socket.assigns.tournament.id, :join, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_event("leave", _params, socket) do
    Tournament.Server.update_tournament(socket.assigns.tournament.id, :leave, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_event("cancel", _params, socket) do
    Tournament.Server.update_tournament(socket.assigns.tournament.id, :cancel, %{
      user: socket.assigns.current_user
    })

    {:noreply, redirect(socket, to: "/tournaments")}
  end

  def handle_event("start", _params, socket) do
    Tournament.Server.update_tournament(socket.assigns.tournament.id, :start, %{
      user: socket.assigns.current_user
    })

    {:noreply, socket}
  end

  def handle_event("chat_message", %{"message" => %{"content" => ""}}, socket),
    do: {:noreply, socket}

  def handle_event("chat_message", params, socket) do
    tournament = socket.assigns.tournament
    current_user = socket.assigns.current_user

    Tournament.Server.add_message(
      tournament.id,
      current_user,
      params["message"]["content"]
    )

    messages = Tournament.Server.get_messages(tournament.id)

    CodebattleWeb.Endpoint.broadcast_from(
      self(),
      topic_name(tournament),
      "update_chat",
      %{messages: messages}
    )

    {:noreply, assign(socket, messages: messages)}
  end

  defp get_next_round_time(tournament) do
    time =
      case tournament.state do
        "active" ->
          NaiveDateTime.add(tournament.last_round_started_at, tournament.match_timeout_seconds)

        _ ->
          tournament.starts_at
      end

    minutes_and_seconds(time)
  end

  defp minutes_and_seconds(time) do
    days = round(Timex.diff(time, Timex.now(), :days))
    hours = round(Timex.diff(time, Timex.now(), :hours) - days * 24)
    minutes = round(Timex.diff(time, Timex.now(), :minutes) - days * 24 * 60 - hours * 60)

    seconds =
      round(
        Timex.diff(time, Timex.now(), :seconds) - days * 24 * 60 * 60 - hours * 60 * 60 -
          minutes * 60
      )

    %{
      minutes: minutes,
      seconds: seconds
    }
  end

  defp topic_name(tournament) do
    "tournament_#{tournament.id}"
  end

  defp is_current_topic?(topic, tournament) do
    topic == topic_name(tournament)
  end
end
