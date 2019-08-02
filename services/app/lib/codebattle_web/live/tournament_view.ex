defmodule CodebattleWeb.Live.TournamentView do
  use Phoenix.LiveView
  use Timex

  alias Codebattle.User
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.GameProcess.Player

  @update_frequency 100

  def render(assigns) do
    CodebattleWeb.TournamentView.render("index.html", assigns)
  end

  def mount(session, socket) do
    if connected?(socket) do
      :timer.send_interval(@update_frequency, self(), :update)
    end

    tournament = Tournament.actual()

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

  def handle_event("join", _params, socket) do
    tournament = socket.assigns.tournament

    new_players =
      tournament.data.players
      |> Enum.concat([socket.assigns.current_user])
      |> Enum.uniq_by(fn x -> x.id end)

    new_tournament =
      tournament
      |> Tournament.changeset(%{
        data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
      })
      |> Repo.update!()

    {:noreply, assign(socket, tournament: new_tournament)}
  end

  def handle_event("start", _params, socket) do
    {:noreply, socket}
  end

  def handle_event("clean", _params, socket) do
    tournament = socket.assigns.tournament

    new_tournament =
      tournament
      |> Tournament.changeset(%{data: DeepMerge.deep_merge(tournament.data, %{players: []})})
      |> Repo.update!()

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
end
