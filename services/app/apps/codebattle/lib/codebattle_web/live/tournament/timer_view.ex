defmodule CodebattleWeb.Live.Tournament.TimerView do
  use CodebattleWeb, :live_view
  use Timex

  import CodebattleWeb.TournamentView

  require Logger

  @timer_tick_frequency :timer.seconds(1)

  @impl true
  def mount(_params, session, socket) do
    tournament = session["tournament"]
    user_timezone = get_in(socket.private, [:connect_params, "timezone"]) || "UTC"

    Codebattle.PubSub.subscribe(topic_name(tournament))

    :timer.send_interval(@timer_tick_frequency, self(), :timer_tick)

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       now: NaiveDateTime.utc_now(:second),
       user_timezone: user_timezone,
       tournament: tournament
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-size:22vw;">
      <div>
        <%= render_remaining_time(
          @tournament.last_round_started_at,
          @tournament.match_timeout_seconds,
          @user_timezone,
          @now
        ) %>
      </div>
    </div>
    """
  end

  @impl true
  def handle_info(:timer_tick, socket) do
    {:noreply, assign(socket, now: NaiveDateTime.utc_now(:second))}
  end

  def handle_info(%{topic: _topic, event: "tournament:updated", payload: payload}, socket) do
    {:noreply, assign(socket, tournament: payload.tournament)}
  end

  def handle_info(event, socket) do
    Logger.debug("CodebattleWeb.Live.Tournament.ShowView unexpected event #{inspect(event)}")
    {:noreply, socket}
  end

  defp topic_name(tournament), do: "tournament:#{tournament.id}"

  defp render_remaining_time(nil, _match_timeout_seconds, _user_timezone, _now) do
    "¯\_(ツ)_/¯"
  end

  defp render_remaining_time(last_round_started_at, match_timeout_seconds, user_timezone, now) do
    datetime = NaiveDateTime.add(last_round_started_at, match_timeout_seconds)
    time_map = get_time_units_map(datetime, now)
    time_str = format_datetime(datetime, user_timezone)

    cond do
      time_map.hours > 0 ->
        "#{render_num(time_map.hours)}::#{render_num(time_map.minutes)}"

      time_map.minutes > 0 ->
        "#{render_num(time_map.minutes)}:#{render_num(time_map.seconds)}"

      time_map.seconds > 0 ->
        "00:#{render_num(time_map.seconds)}"

      true ->
        "¯\_(ツ)_/¯"
    end
  end

  defp render_num(num), do: String.pad_leading(to_string(num), 2, "0")

  defp get_time_units_map(datetime, now) do
    days = round(Timex.diff(datetime, now, :days))
    hours = round(Timex.diff(datetime, now, :hours) - days * 24)
    minutes = round(Timex.diff(datetime, now, :minutes) - days * 24 * 60 - hours * 60)

    seconds =
      round(
        Timex.diff(datetime, now, :seconds) - days * 24 * 60 * 60 - hours * 60 * 60 -
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
