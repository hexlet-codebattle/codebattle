defmodule CodebattleWeb.Live.Tournament.NextRoundTimerComponent do
  use CodebattleWeb, :component

  def render(assigns) do
    ~H"""
    <div>
      <h4>
        <%= round_or_tournament(@tournament) <>
          render_time_to_start(@tournament, @next_round_time, @user_timezone, @time_now) %>
      </h4>
    </div>
    """
  end

  defp round_or_tournament(%{state: "waiting_participants"}), do: "The tournament will start in "

  defp round_or_tournament(%{state: "active", break_state: "on"}),
    do: "Next round will start in "

  defp round_or_tournament(%{state: "active", break_state: "off"}), do: "Last round started at "
  defp round_or_tournament(_), do: ""

  defp render_time_to_start(
         tournament = %{state: "active", break_state: "off"},
         _next_round_time,
         user_timezone,
         _time_now
       ) do
    format_datetime(tournament.last_round_started_at, user_timezone)
  end

  defp render_time_to_start(_tournament, nil, _user_timezone, _time_now), do: ""

  defp render_time_to_start(_tournament, next_round_time, user_timezone, time_now) do
    time_map = get_time_units_map(next_round_time, time_now)
    time_str = format_datetime(next_round_time, user_timezone)

    cond do
      time_map.days > 0 ->
        "#{render_num(time_map.days)} day(s) #{render_num(time_map.hours)} hour(s). At #{time_str}"

      time_map.hours > 0 ->
        "#{render_num(time_map.hours)} hour(s), #{render_num(time_map.minutes)} min. At #{time_str}"

      time_map.minutes > 0 ->
        "#{render_num(time_map.minutes)} min, #{render_num(time_map.seconds)} sec. At #{time_str}"

      time_map.seconds > 0 ->
        "#{render_num(time_map.seconds)} sec"

      true ->
        "a moment"
    end
  end

  defp render_num(num), do: String.pad_leading(to_string(num), 2, "0")

  defp get_time_units_map(time, nil) do
    get_time_units_map(time, Timex.now())
  end

  defp get_time_units_map(time, time_now) do
    days = round(Timex.diff(time, time_now, :days))
    hours = round(Timex.diff(time, time_now, :hours) - days * 24)
    minutes = round(Timex.diff(time, time_now, :minutes) - days * 24 * 60 - hours * 60)

    seconds =
      round(
        Timex.diff(time, time_now, :seconds) - days * 24 * 60 * 60 - hours * 60 * 60 -
          minutes * 60
      )

    %{
      days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds
    }
  end

  defp format_datetime(datetime = %NaiveDateTime{}, user_timezone) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_datetime(user_timezone)
  end

  defp format_datetime(datetime = %DateTime{}, user_timezone) do
    datetime
    |> DateTime.shift_zone!(user_timezone)
    |> Timex.format!("%Y-%m-%d %H:%M %Z", :strftime)
  end
end
