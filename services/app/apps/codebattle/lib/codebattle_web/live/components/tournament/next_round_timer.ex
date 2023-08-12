defmodule CodebattleWeb.Live.Tournament.NextRoundTimerComponent do
  use CodebattleWeb, :live_component

  @update_frequency 1_000

  @impl true
  def mount(socket) do
    user_timezone = get_in(socket.private, [:connect_params, "timezone"]) || "UTC"

    :timer.send_interval(@update_frequency, self(), :timer_tick)

    {:ok,
     assign(socket,
       initialized: false,
       next_round_time: nil,
       user_timezone: user_timezone
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <h4>
        <%= time_prefix({@tournament_state, @break_state}) <>
          render_next_round_time(@next_round_time, @user_timezone) %>
      </h4>
    </div>
    """
  end


  defp time_prefix({"active", "on"}), do: "Next round will start in "
  defp time_prefix({"active", "off"}), do: "Last round started at "
  defp time_prefix({"waiting_participants", _}), do: "The tournament will start in "
  defp time_prefix(_), do: ""

  defp render_next_round_time(nil, _user_timezone), do: ""

  defp render_next_round_time(next_round_time, user_timezone) do
    time_map = get_time_units_map(next_round_time)
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

  defp get_time_units_map(time) do
    days = round(Timex.diff(time, :days))
    hours = round(Timex.diff(time, :hours) - days * 24)
    minutes = round(Timex.diff(time, :minutes) - days * 24 * 60 - hours * 60)

    seconds =
      round(
        Timex.diff(time, Timex.now(), :seconds) - days * 24 * 60 * 60 - hours * 60 * 60 -
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
