defmodule CodebattleWeb.Live.Admin.IndexView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Task
  alias Codebattle.Tournament
  alias Codebattle.User

  @chart_windows %{
    "all_time" => %{label: "All Time", granularity: :month, bucket_label: "Monthly"},
    "last_year" => %{label: "Last Year", granularity: :week, bucket_label: "Weekly"},
    "last_three_months" => %{label: "Last 3 Months", granularity: :day, bucket_label: "Daily"},
    "last_week" => %{label: "Last Week", granularity: :hour, bucket_label: "Hourly"}
  }
  @chart_window_order ["all_time", "last_year", "last_three_months", "last_week"]

  @default_chart_window "last_three_months"

  @impl true
  def mount(params, _session, socket) do
    chart_window = normalize_chart_window(params["window"])
    socket = assign_chart_data(socket, chart_window)

    {:ok,
     assign(socket,
       layout: {CodebattleWeb.LayoutView, :admin},
       stats: %{
         users: Repo.aggregate(User, :count, :id),
         tasks: Repo.aggregate(Task, :count, :id),
         games: Repo.aggregate(Game, :count, :id),
         tournaments: Repo.aggregate(Tournament, :count, :id)
       },
       chart_windows: @chart_windows,
       chart_window_order: @chart_window_order
     )}
  end

  @impl true
  def handle_event("set_chart_window", %{"window" => window}, socket) do
    chart_window = normalize_chart_window(window)

    {:noreply,
     socket
     |> assign_chart_data(chart_window)
     |> push_patch(to: "/admin?window=#{chart_window}")}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    chart_window = normalize_chart_window(params["window"])
    {:noreply, assign_chart_data(socket, chart_window)}
  end

  defp assign_chart_data(socket, chart_window) do
    %{joins: joins, from: joins_from, to: joins_to, granularity: granularity} = list_user_joins(chart_window)
    max_joins = joins |> Enum.map(& &1.count) |> Enum.max(fn -> 1 end)

    assign(socket,
      chart_window: chart_window,
      granularity: granularity,
      joins_from: joins_from,
      joins_to: joins_to,
      joins: joins,
      total_joins: Enum.sum(Enum.map(joins, & &1.count)),
      max_joins: max_joins,
      joins_chart_points: build_chart_points(joins, max_joins)
    )
  end

  defp normalize_chart_window(nil), do: @default_chart_window
  defp normalize_chart_window(window) when is_map_key(@chart_windows, window), do: window
  defp normalize_chart_window(_window), do: @default_chart_window

  defp list_user_joins(window_key) do
    config = @chart_windows[window_key]
    granularity = config.granularity
    now = truncate_datetime(NaiveDateTime.utc_now(), granularity)

    from_datetime =
      case window_key do
        "all_time" ->
          from(u in User, select: min(u.inserted_at))
          |> Repo.one()
          |> case do
            nil -> now
            inserted_at -> truncate_datetime(inserted_at, granularity)
          end

        "last_year" ->
          now
          |> datetime_months_ago(12)
          |> truncate_datetime(granularity)

        "last_three_months" ->
          now
          |> datetime_months_ago(3)
          |> truncate_datetime(granularity)

        "last_week" ->
          now
          |> NaiveDateTime.add(-7 * 24 * 60 * 60, :second)
          |> truncate_datetime(granularity)
      end

    to_datetime = now

    grouped_query =
      User
      |> where([u], u.inserted_at >= ^from_datetime)
      |> where([u], u.inserted_at <= ^to_datetime)
      |> group_and_select_query(granularity)

    counts_by_bucket =
      grouped_query
      |> Repo.all()
      |> Map.new(fn {bucket, count} -> {normalize_datetime(bucket), count} end)

    joins =
      from_datetime
      |> datetime_range(to_datetime, granularity)
      |> Enum.map(fn bucket ->
        %{bucket: bucket, count: Map.get(counts_by_bucket, bucket, 0)}
      end)

    %{
      joins: joins,
      from: from_datetime,
      to: to_datetime,
      granularity: granularity
    }
  end

  defp normalize_datetime(%NaiveDateTime{} = datetime), do: datetime
  defp normalize_datetime(%DateTime{} = datetime), do: DateTime.to_naive(datetime)
  defp normalize_datetime(%Date{} = date), do: NaiveDateTime.new!(date, ~T[00:00:00])

  defp normalize_datetime(date_time) when is_binary(date_time) do
    case_result =
      case NaiveDateTime.from_iso8601(date_time) do
        {:ok, parsed_datetime} ->
          parsed_datetime

        {:error, _} ->
          Date.utc_today()
      end

    normalize_datetime(case_result)
  end

  defp truncate_datetime(%NaiveDateTime{} = datetime, :hour), do: %{datetime | minute: 0, second: 0, microsecond: {0, 0}}

  defp truncate_datetime(%NaiveDateTime{} = datetime, :day),
    do: %{datetime | hour: 0, minute: 0, second: 0, microsecond: {0, 0}}

  defp truncate_datetime(%NaiveDateTime{} = datetime, :week) do
    datetime
    |> NaiveDateTime.to_date()
    |> Date.beginning_of_week()
    |> NaiveDateTime.new!(~T[00:00:00])
  end

  defp truncate_datetime(%NaiveDateTime{} = datetime, :month),
    do: NaiveDateTime.new!(Date.beginning_of_month(NaiveDateTime.to_date(datetime)), ~T[00:00:00])

  defp group_and_select_query(query, :hour) do
    query
    |> group_by([u], fragment("date_trunc('hour', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('hour', ?)", u.inserted_at), count(u.id)})
  end

  defp group_and_select_query(query, :day) do
    query
    |> group_by([u], fragment("date_trunc('day', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('day', ?)", u.inserted_at), count(u.id)})
  end

  defp group_and_select_query(query, :week) do
    query
    |> group_by([u], fragment("date_trunc('week', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('week', ?)", u.inserted_at), count(u.id)})
  end

  defp group_and_select_query(query, :month) do
    query
    |> group_by([u], fragment("date_trunc('month', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('month', ?)", u.inserted_at), count(u.id)})
  end

  defp datetime_months_ago(%NaiveDateTime{} = datetime, months_back) do
    date = NaiveDateTime.to_date(datetime)
    current_index = date.year * 12 + date.month - 1
    target_index = current_index - months_back
    target_year = div(target_index, 12)
    target_month = rem(target_index, 12) + 1
    max_day = Date.days_in_month(Date.new!(target_year, target_month, 1))
    target_day = min(date.day, max_day)
    target_date = Date.new!(target_year, target_month, target_day)
    NaiveDateTime.new!(target_date, NaiveDateTime.to_time(datetime))
  end

  defp datetime_range(from_datetime, to_datetime, granularity) do
    do_datetime_range(from_datetime, to_datetime, granularity, [])
  end

  defp do_datetime_range(current, to_datetime, _granularity, acc) when current > to_datetime, do: Enum.reverse(acc)

  defp do_datetime_range(current, to_datetime, granularity, acc) do
    next = next_bucket(current, granularity)
    do_datetime_range(next, to_datetime, granularity, [current | acc])
  end

  defp next_bucket(datetime, :hour), do: NaiveDateTime.add(datetime, 60 * 60, :second)
  defp next_bucket(datetime, :day), do: NaiveDateTime.add(datetime, 24 * 60 * 60, :second)
  defp next_bucket(datetime, :week), do: NaiveDateTime.add(datetime, 7 * 24 * 60 * 60, :second)
  defp next_bucket(datetime, :month), do: datetime_months_ago(datetime, -1)

  defp format_chart_datetime(datetime, :hour), do: Calendar.strftime(datetime, "%Y-%m-%d %H:%M")
  defp format_chart_datetime(datetime, :day), do: Calendar.strftime(datetime, "%Y-%m-%d")
  defp format_chart_datetime(datetime, :week), do: Calendar.strftime(datetime, "%Y-%m-%d")
  defp format_chart_datetime(datetime, :month), do: Calendar.strftime(datetime, "%Y-%m")

  defp format_axis_datetime(datetime, :hour), do: Calendar.strftime(datetime, "%b %d %H:%M")
  defp format_axis_datetime(datetime, :day), do: Calendar.strftime(datetime, "%b %d")
  defp format_axis_datetime(datetime, :week), do: Calendar.strftime(datetime, "%b %d")
  defp format_axis_datetime(datetime, :month), do: Calendar.strftime(datetime, "%b %Y")

  defp peak_label(:hour), do: "Peak Hourly"
  defp peak_label(:day), do: "Peak Daily"
  defp peak_label(:week), do: "Peak Weekly"
  defp peak_label(:month), do: "Peak Monthly"

  defp chart_title(:hour), do: "User Registrations by Hour"
  defp chart_title(:day), do: "User Registrations by Day"
  defp chart_title(:week), do: "User Registrations by Week"
  defp chart_title(:month), do: "User Registrations by Month"

  defp window_button_class(window_key, active_window) do
    base = "btn cb-rounded mr-2 mb-2"

    if window_key == active_window do
      "#{base} btn-primary"
    else
      "#{base} btn-secondary cb-btn-secondary"
    end
  end

  defp build_chart_points(joins, max_joins) do
    chart_width = 940
    chart_height = 240
    padding = 24
    plot_width = chart_width - padding * 2
    plot_height = chart_height - padding * 2
    points_count = max(length(joins) - 1, 1)

    joins
    |> Enum.with_index()
    |> Enum.map_join(" ", fn {%{count: count}, index} ->
      x = padding + index * (plot_width / points_count)
      y = padding + (plot_height - count / max(max_joins, 1) * plot_height)
      "#{Float.round(x, 2)},#{Float.round(y, 2)}"
    end)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-fluid px-0">
      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-4">
        <h1 class="text-white mb-1">Codebattle Admin Dashboard</h1>
        <p class="cb-text mb-4">
          Operational overview with real-time platform totals and user growth trend.
        </p>

        <div class="row">
          <div class="col-12 col-sm-6 col-xl-3 mb-3">
            <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
              <div class="cb-text text-uppercase">Users</div>
              <div class="text-white" style="font-size: 2rem; font-weight: 700;">{@stats.users}</div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-xl-3 mb-3">
            <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
              <div class="cb-text text-uppercase">Tasks</div>
              <div class="text-white" style="font-size: 2rem; font-weight: 700;">{@stats.tasks}</div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-xl-3 mb-3">
            <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
              <div class="cb-text text-uppercase">Games</div>
              <div class="text-white" style="font-size: 2rem; font-weight: 700;">{@stats.games}</div>
            </div>
          </div>
          <div class="col-12 col-sm-6 col-xl-3 mb-3">
            <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
              <div class="cb-text text-uppercase">Tournaments</div>
              <div class="text-white" style="font-size: 2rem; font-weight: 700;">
                {@stats.tournaments}
              </div>
            </div>
          </div>
        </div>

        <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mt-2">
          <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <h3 class="text-white mb-0">{chart_title(@granularity)}</h3>
            <span class="cb-text">
              {format_chart_datetime(@joins_from, @granularity)} to {format_chart_datetime(
                @joins_to,
                @granularity
              )} • Total: {@total_joins}
            </span>
          </div>

          <svg
            viewBox="0 0 940 240"
            width="100%"
            height="240"
            role="img"
            aria-label="User joins trend"
          >
            <rect x="0" y="0" width="940" height="240" rx="8" ry="8" fill="#15151c"></rect>
            <polyline
              points={@joins_chart_points}
              fill="none"
              stroke="#6ea8ff"
              stroke-width="3"
              stroke-linejoin="round"
              stroke-linecap="round"
            >
            </polyline>
          </svg>

          <div class="d-flex justify-content-between cb-text mt-1">
            <span>{format_axis_datetime(@joins_from, @granularity)}</span>
            <span>{peak_label(@granularity)}: {@max_joins}</span>
            <span>{format_axis_datetime(@joins_to, @granularity)}</span>
          </div>

          <div class="d-flex flex-wrap justify-content-center mt-3">
            <%= for window_key <- @chart_window_order do %>
              <% window = @chart_windows[window_key] %>
              <button
                type="button"
                phx-click="set_chart_window"
                phx-value-window={window_key}
                class={window_button_class(window_key, @chart_window)}
              >
                {window.label} ({window.bucket_label})
              </button>
            <% end %>
          </div>
        </div>
      </div>
    </div>
    """
  end
end
