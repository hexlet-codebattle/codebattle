defmodule CodebattleWeb.Live.Tournament.ShowView do
  use Phoenix.LiveView
  use Timex

  alias Codebattle.User
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  @update_frequency 100

  def render(assigns) do
    CodebattleWeb.TournamentView.render("show.html", assigns)
  end

  def mount(session, socket) do
    if connected?(socket) do
      :timer.send_interval(@update_frequency, self(), :update)
    end

    tournament = Tournament.get!(session[:id])
    CodebattleWeb.Endpoint.subscribe(topic_name(tournament))

    {:ok,
     assign(socket,
       current_user: session[:current_user],
       tournament: tournament,
       time: updated_time(tournament.starts_at)
     )}
  end

  def handle_info(:update, socket) do
    tournament = socket.assigns.tournament
    {:noreply, assign(socket, time: updated_time(tournament.starts_at))}
  end

  def handle_info(%{topic: topic, event: "update_tournament", payload: payload} = params, socket) do
    if is_current_topic?(topic, socket.assigns.tournament) do
      {:noreply, assign(socket, tournament: payload.tournament)}
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

  defp updated_time(starts_at) do
    diff = Time.diff(starts_at, Timex.now(), :second)
    days = round(Timex.diff(starts_at, Timex.now(), :days))
    hours = round(Timex.diff(starts_at, Timex.now(), :hours) - days * 24)
    minutes = round(Timex.diff(starts_at, Timex.now(), :minutes) - days * 24 * 60 - hours * 60)

    seconds =
      round(
        Timex.diff(starts_at, Timex.now(), :seconds) - days * 24 * 60 * 60 - hours * 60 * 60 -
          minutes * 60
      )

    %{
      days: days,
      hours: hours,
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
