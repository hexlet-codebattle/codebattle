defmodule CodebattleWeb.Live.Tournament.NextRoundTimerComponent do
  use CodebattleWeb, :live_component

  @impl true
  def mount(socket) do
    {:ok, assign(socket, initialized: false)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <h3 class="ml-3">
        <%= round_or_tournament(@tournament) <> render_time_to_start(@tournament, @next_round_time, @user_timezone) %>
      </h3>
    </div>
    """
  end

  defp round_or_tournament(%{state: "waiting_participants"}), do: "The tournament will start in "

  defp round_or_tournament(%{state: "active", break_state: "break"}),
    do: "Next round will start in "

  defp round_or_tournament(%{state: "active", break_state: "off"}), do: "Last round started at "
  defp round_or_tournament(_), do: ""

  defp render_time_to_start(tournament = %{state: "active", break_state: "off"}, _next_round_time, user_timezone) do
  IO.inspect(tournament.last_round_started_at)
  IO.inspect(user_timezone)
   tournament.last_round_started_at
    |> Timex.Timezone.convert(user_timezone)
   |> IO.inspect
    |> Timex.format!("%H:%M:%S", :strftime)
   |> IO.inspect
  end

  defp render_time_to_start(_tournament, next_round_time) do
    time_map = get_time_units_map(next_round_time)

    cond do
      time_map.days > 0 ->
        "#{render_num(time_map.days)} day(s) #{render_num(time_map.hours)} hour(s)"

      time_map.hours > 0 ->
        "#{render_num(time_map.hours)} hour(s), #{render_num(time_map.minutes)} min"

      time_map.minutes > 0 ->
        "#{render_num(time_map.minutes)} min, #{render_num(time_map.seconds)} sec"

      time_map.seconds > 0 ->
        "#{render_num(time_map.seconds)} sec"

      true ->
        "a moment"
    end
  end

  defp render_num(num), do: String.pad_leading(to_string(num), 2, "0")

  defp get_time_units_map(time) do
    days = round(Timex.diff(time, Timex.now(), :days))
    hours = round(Timex.diff(time, Timex.now(), :hours) - days * 24)
    minutes = round(Timex.diff(time, Timex.now(), :minutes) - days * 24 * 60 - hours * 60)

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
end
