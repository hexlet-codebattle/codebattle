defmodule CodebattleWeb.Live.Tournament.TimerComponent do
  use CodebattleWeb, :live_component

  import CodebattleWeb.TournamentView

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.render_state_badge break_state={@break_state} tournament_state={@tournament_state} />
      <.render_next_time {assigns} />
    </div>
    """
  end

  defp render_state_badge(assigns = %{tournament_state: "waiting_participants"}) do
    ~H(<span class="badge badge-warning"><%= "Waiting Participants" %></span>)
  end

  defp render_state_badge(assigns = %{break_state: "off"}) do
    ~H(<span class="badge badge-success"><%= "Active" %></span>)
  end

  defp render_state_badge(assigns = %{break_state: "on"}) do
    ~H(<span class="badge badge-danger"><%= "Round Break" %></span>)
  end

  defp render_next_time(assigns = %{tournament_state: "waiting_participants"}) do
    ~H"""
    <span class="h5">
      The tournament will start in <%= render_remaining_time(@starts_at, @user_timezone, @now) %>
    </span>
    """
  end

  defp render_next_time(assigns = %{break_state: "off"}) do
    ~H"""
    <span class="h5">
      Round ends in <%= render_remaining_time(
        NaiveDateTime.add(@last_round_started_at, @match_timeout_seconds),
        @user_timezone,
        @now
      ) %>
    </span>
    """
  end

  defp render_next_time(assigns = %{break_state: "on"}) do
    ~H"""
    <span class="h5">
      Next round will start in <%= render_remaining_time(
        NaiveDateTime.add(@last_round_ended_at, @break_duration_seconds),
        @user_timezone,
        @now
      ) %>
    </span>
    """
  end

  defp render_remaining_time(datetime, user_timezone, now) do
    time_map = get_time_units_map(datetime, now)
    time_str = format_datetime(datetime, user_timezone)

    cond do
      time_map.days > 0 ->
        "#{render_num(time_map.days)} day(s) #{render_num(time_map.hours)} hour(s). At #{time_str}"

      time_map.hours > 0 ->
        "#{render_num(time_map.hours)} hour(s), #{render_num(time_map.minutes)} min. At #{time_str}"

      time_map.minutes > 0 ->
        "#{render_num(time_map.minutes)} min, #{render_num(time_map.seconds)} sec"

      time_map.seconds > 0 ->
        "#{render_num(time_map.seconds)} sec"

      true ->
        "a moment"
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
