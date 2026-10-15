defmodule CodebattleWeb.Live.Admin.IndexView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Task
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserGame
  alias Phoenix.LiveView.AsyncResult

  @chart_windows %{
    "all_time" => %{label: "All Time", granularity: :month, bucket_label: "Monthly"},
    "last_year" => %{label: "Last Year", granularity: :week, bucket_label: "Weekly"},
    "last_three_months" => %{label: "Last 3 Months", granularity: :day, bucket_label: "Daily"},
    "last_week" => %{label: "Last Week", granularity: :hour, bucket_label: "Hourly"}
  }
  @chart_window_order ["all_time", "last_year", "last_three_months", "last_week"]

  @default_chart_window "last_three_months"
  @gold "#e0bf7a"
  @silver "#c2c9d6"
  @bronze "#c48a57"
  @platinum "#a4aab3"
  @steel "#8a919c"
  @iron "#6f7782"

  @impl true
  def mount(params, _session, socket) do
    registrations_window = normalize_chart_window(params["registrations_window"])
    games_window = normalize_chart_window(params["games_window"])
    active_users_window = normalize_chart_window(params["active_users_window"])

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
       chart_window_order: @chart_window_order,
       registrations_window: registrations_window,
       games_window: games_window,
       active_users_window: active_users_window,
       registrations_chart: AsyncResult.loading(),
       games_chart: AsyncResult.loading(),
       active_users_chart: AsyncResult.loading()
     )}
  end

  @impl true
  def handle_event("set_chart_window", %{"window" => window, "target" => target}, socket) do
    chart_window = normalize_chart_window(window)

    {registrations_window, games_window, active_users_window} =
      case target do
        "registrations" ->
          {chart_window, socket.assigns.games_window, socket.assigns.active_users_window}

        "games" ->
          {socket.assigns.registrations_window, chart_window, socket.assigns.active_users_window}

        "active_users" ->
          {socket.assigns.registrations_window, socket.assigns.games_window, chart_window}

        _ ->
          {socket.assigns.registrations_window, socket.assigns.games_window, socket.assigns.active_users_window}
      end

    {:noreply, push_patch(socket, to: chart_path(registrations_window, games_window, active_users_window))}
  end

  @impl true
  def handle_event("set_chart_window", %{"window" => window}, socket) do
    handle_event("set_chart_window", %{"window" => window, "target" => "registrations"}, socket)
  end

  @impl true
  def handle_params(params, _uri, socket) do
    previous_registrations_window = socket.assigns.registrations_window
    previous_games_window = socket.assigns.games_window
    previous_active_users_window = socket.assigns.active_users_window

    registrations_window = normalize_chart_window(params["registrations_window"])
    games_window = normalize_chart_window(params["games_window"])
    active_users_window = normalize_chart_window(params["active_users_window"])

    {:noreply,
     socket
     |> assign(:registrations_window, registrations_window)
     |> assign(:games_window, games_window)
     |> assign(:active_users_window, active_users_window)
     |> maybe_assign_registrations_chart_data_async(
       registrations_window,
       previous_registrations_window
     )
     |> maybe_assign_games_chart_data_async(games_window, previous_games_window)
     |> maybe_assign_active_users_chart_data_async(
       active_users_window,
       previous_active_users_window
     )}
  end

  defp maybe_assign_registrations_chart_data_async(socket, chart_window, previous_window) do
    should_refresh = previous_window != chart_window or not socket.assigns.registrations_chart.ok?

    if should_refresh do
      assign_registrations_chart_data_async(socket, chart_window)
    else
      socket
    end
  end

  defp maybe_assign_games_chart_data_async(socket, chart_window, previous_window) do
    should_refresh = previous_window != chart_window or not socket.assigns.games_chart.ok?

    if should_refresh do
      assign_games_chart_data_async(socket, chart_window)
    else
      socket
    end
  end

  defp maybe_assign_active_users_chart_data_async(socket, chart_window, previous_window) do
    should_refresh = previous_window != chart_window or not socket.assigns.active_users_chart.ok?

    if should_refresh do
      assign_active_users_chart_data_async(socket, chart_window)
    else
      socket
    end
  end

  defp assign_registrations_chart_data_async(socket, chart_window) do
    assign_async(
      socket,
      :registrations_chart,
      fn ->
        {:ok, %{registrations_chart: build_registrations_chart_data(chart_window)}}
      end,
      reset: true
    )
  end

  defp assign_games_chart_data_async(socket, chart_window) do
    assign_async(
      socket,
      :games_chart,
      fn ->
        {:ok, %{games_chart: build_games_chart_data(chart_window)}}
      end,
      reset: true
    )
  end

  defp assign_active_users_chart_data_async(socket, chart_window) do
    assign_async(
      socket,
      :active_users_chart,
      fn ->
        {:ok, %{active_users_chart: build_active_users_chart_data(chart_window)}}
      end,
      reset: true
    )
  end

  defp build_registrations_chart_data(chart_window) do
    %{joins: joins, from: joins_from, to: joins_to, granularity: granularity} = list_user_joins(chart_window)
    max_joins = joins |> Enum.map(& &1.count) |> Enum.max(fn -> 1 end)

    %{
      granularity: granularity,
      joins_from: joins_from,
      joins_to: joins_to,
      joins: joins,
      total_joins: Enum.sum(Enum.map(joins, & &1.count)),
      max_joins: max_joins,
      joins_chart_path: build_chart_path(joins, max_joins)
    }
  end

  defp build_games_chart_data(chart_window) do
    %{joins: games, from: games_from, to: games_to, granularity: granularity} = list_game_creations(chart_window)
    max_games = games |> Enum.map(& &1.count) |> Enum.max(fn -> 1 end)

    %{
      granularity: granularity,
      games_from: games_from,
      games_to: games_to,
      games: games,
      total_games: Enum.sum(Enum.map(games, & &1.count)),
      max_games: max_games,
      games_chart_path: build_chart_path(games, max_games)
    }
  end

  defp build_active_users_chart_data(chart_window) do
    %{joins: active_users, from: active_users_from, to: active_users_to, granularity: granularity} =
      list_active_user_joins(chart_window)

    max_active_users = active_users |> Enum.map(& &1.count) |> Enum.max(fn -> 1 end)

    %{
      granularity: granularity,
      active_users_from: active_users_from,
      active_users_to: active_users_to,
      active_users: active_users,
      total_active_users: Enum.sum(Enum.map(active_users, & &1.count)),
      max_active_users: max_active_users,
      active_users_chart_path: build_chart_path(active_users, max_active_users)
    }
  end

  defp normalize_chart_window(nil), do: @default_chart_window
  defp normalize_chart_window(window) when is_map_key(@chart_windows, window), do: window
  defp normalize_chart_window(_window), do: @default_chart_window

  defp list_user_joins(window_key) do
    config = @chart_windows[window_key]
    granularity = config.granularity

    %{from: from_datetime, to: to_datetime, query_to: query_to_datetime} =
      metric_time_window(window_key, granularity, User)

    grouped_query =
      User
      |> where([u], u.inserted_at >= ^from_datetime)
      |> where([u], u.inserted_at <= ^query_to_datetime)
      |> group_and_select_user_query(granularity)

    build_metric_joins(grouped_query, from_datetime, to_datetime, granularity)
  end

  defp list_game_creations(window_key) do
    config = @chart_windows[window_key]
    granularity = config.granularity

    %{from: from_datetime, to: to_datetime, query_to: query_to_datetime} =
      metric_time_window(window_key, granularity, Game)

    grouped_query =
      Game
      |> where([g], g.inserted_at >= ^from_datetime)
      |> where([g], g.inserted_at <= ^query_to_datetime)
      |> group_and_select_game_query(granularity)

    build_metric_joins(grouped_query, from_datetime, to_datetime, granularity)
  end

  defp list_active_user_joins(window_key) do
    config = @chart_windows[window_key]
    granularity = config.granularity

    %{from: from_datetime, to: to_datetime, query_to: query_to_datetime} =
      metric_time_window(window_key, granularity, UserGame)

    grouped_query =
      UserGame
      |> where([ug], ug.inserted_at >= ^from_datetime)
      |> where([ug], ug.inserted_at <= ^query_to_datetime)
      |> group_and_select_active_user_query(granularity)

    build_metric_joins(grouped_query, from_datetime, to_datetime, granularity)
  end

  defp metric_time_window(window_key, granularity, schema) do
    config = @chart_windows[window_key]
    query_to_datetime = NaiveDateTime.utc_now()
    to_datetime = truncate_datetime(query_to_datetime, granularity)

    from_datetime =
      case window_key do
        "all_time" ->
          from(record in schema, select: min(record.inserted_at))
          |> Repo.one()
          |> case do
            nil -> to_datetime
            inserted_at -> truncate_datetime(inserted_at, granularity)
          end

        "last_year" ->
          to_datetime
          |> datetime_months_ago(12)
          |> truncate_datetime(granularity)

        "last_three_months" ->
          to_datetime
          |> datetime_months_ago(3)
          |> truncate_datetime(granularity)

        "last_week" ->
          to_datetime
          |> NaiveDateTime.add(-7 * 24 * 60 * 60, :second)
          |> truncate_datetime(granularity)
      end

    %{from: from_datetime, to: to_datetime, query_to: query_to_datetime, granularity: config.granularity}
  end

  defp build_metric_joins(grouped_query, from_datetime, to_datetime, granularity) do
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

  defp normalize_datetime(%NaiveDateTime{} = datetime), do: %{datetime | microsecond: {0, 0}}
  defp normalize_datetime(%DateTime{} = datetime), do: datetime |> DateTime.to_naive() |> normalize_datetime()
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

  defp group_and_select_user_query(query, :hour) do
    query
    |> group_by([u], fragment("date_trunc('hour', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('hour', ?)", u.inserted_at), count(u.id)})
  end

  defp group_and_select_user_query(query, :day) do
    query
    |> group_by([u], fragment("date_trunc('day', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('day', ?)", u.inserted_at), count(u.id)})
  end

  defp group_and_select_user_query(query, :week) do
    query
    |> group_by([u], fragment("date_trunc('week', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('week', ?)", u.inserted_at), count(u.id)})
  end

  defp group_and_select_user_query(query, :month) do
    query
    |> group_by([u], fragment("date_trunc('month', ?)", u.inserted_at))
    |> Ecto.Query.select([u], {fragment("date_trunc('month', ?)", u.inserted_at), count(u.id)})
  end

  defp group_and_select_game_query(query, :hour) do
    query
    |> group_by([g], fragment("date_trunc('hour', ?)", g.inserted_at))
    |> Ecto.Query.select([g], {fragment("date_trunc('hour', ?)", g.inserted_at), count(g.id)})
  end

  defp group_and_select_game_query(query, :day) do
    query
    |> group_by([g], fragment("date_trunc('day', ?)", g.inserted_at))
    |> Ecto.Query.select([g], {fragment("date_trunc('day', ?)", g.inserted_at), count(g.id)})
  end

  defp group_and_select_game_query(query, :week) do
    query
    |> group_by([g], fragment("date_trunc('week', ?)", g.inserted_at))
    |> Ecto.Query.select([g], {fragment("date_trunc('week', ?)", g.inserted_at), count(g.id)})
  end

  defp group_and_select_game_query(query, :month) do
    query
    |> group_by([g], fragment("date_trunc('month', ?)", g.inserted_at))
    |> Ecto.Query.select([g], {fragment("date_trunc('month', ?)", g.inserted_at), count(g.id)})
  end

  defp group_and_select_active_user_query(query, :hour) do
    query
    |> group_by([ug], fragment("date_trunc('hour', ?)", ug.inserted_at))
    |> Ecto.Query.select([ug], {fragment("date_trunc('hour', ?)", ug.inserted_at), count(ug.user_id, :distinct)})
  end

  defp group_and_select_active_user_query(query, :day) do
    query
    |> group_by([ug], fragment("date_trunc('day', ?)", ug.inserted_at))
    |> Ecto.Query.select([ug], {fragment("date_trunc('day', ?)", ug.inserted_at), count(ug.user_id, :distinct)})
  end

  defp group_and_select_active_user_query(query, :week) do
    query
    |> group_by([ug], fragment("date_trunc('week', ?)", ug.inserted_at))
    |> Ecto.Query.select([ug], {fragment("date_trunc('week', ?)", ug.inserted_at), count(ug.user_id, :distinct)})
  end

  defp group_and_select_active_user_query(query, :month) do
    query
    |> group_by([ug], fragment("date_trunc('month', ?)", ug.inserted_at))
    |> Ecto.Query.select([ug], {fragment("date_trunc('month', ?)", ug.inserted_at), count(ug.user_id, :distinct)})
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

  defp do_datetime_range(current, to_datetime, granularity, acc) do
    if NaiveDateTime.after?(current, to_datetime) do
      Enum.reverse(acc)
    else
      next = next_bucket(current, granularity)
      do_datetime_range(next, to_datetime, granularity, [current | acc])
    end
  end

  defp next_bucket(datetime, :hour), do: NaiveDateTime.add(datetime, 60 * 60, :second)
  defp next_bucket(datetime, :day), do: NaiveDateTime.add(datetime, 24 * 60 * 60, :second)
  defp next_bucket(datetime, :week), do: NaiveDateTime.add(datetime, 7 * 24 * 60 * 60, :second)
  defp next_bucket(datetime, :month), do: datetime_months_ago(datetime, -1)

  defp format_chart_datetime(datetime, :hour), do: Calendar.strftime(datetime, "%Y-%m-%d %H:%M")
  defp format_chart_datetime(datetime, :day), do: Calendar.strftime(datetime, "%Y-%m-%d")
  defp format_chart_datetime(datetime, :week), do: Calendar.strftime(datetime, "%Y-%m-%d")
  defp format_chart_datetime(datetime, :month), do: Calendar.strftime(datetime, "%Y-%m")

  defp format_axis_datetime(datetime, :hour), do: Calendar.strftime(datetime, "%b %d")
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

  defp games_chart_title(:hour), do: "Games Created by Hour"
  defp games_chart_title(:day), do: "Games Created by Day"
  defp games_chart_title(:week), do: "Games Created by Week"
  defp games_chart_title(:month), do: "Games Created by Month"

  defp active_users_chart_title(:hour), do: "Unique Active Users by Hour"
  defp active_users_chart_title(:day), do: "Unique Active Users by Day"
  defp active_users_chart_title(:week), do: "Unique Active Users by Week"
  defp active_users_chart_title(:month), do: "Unique Active Users by Month"

  defp chart_granularity(window_key), do: @chart_windows[window_key].granularity

  defp chart_path(registrations_window, games_window, active_users_window) do
    "/admin?" <>
      URI.encode_query(%{
        "registrations_window" => registrations_window,
        "games_window" => games_window,
        "active_users_window" => active_users_window
      })
  end

  defp chart_series_color(:registrations), do: @gold
  defp chart_series_color(:games), do: @silver
  defp chart_series_color(:active_users), do: @bronze
  defp chart_axis_text_color, do: @platinum
  defp chart_grid_color, do: @steel
  defp chart_secondary_text_color, do: @iron

  defp window_button_class(window_key, active_window) do
    base = "btn cb-rounded mr-2 mb-2"

    if window_key == active_window do
      "#{base} btn-secondary"
    else
      "#{base} btn-secondary cb-btn-secondary"
    end
  end

  defp window_button_style(window_key, active_window, chart_type) do
    if window_key == active_window do
      color = chart_series_color(chart_type)
      "background-color: #{color}; border-color: #{color}; color: #15151c;"
    end
  end

  defp build_chart_coordinates(joins, max_joins) do
    plot_width = chart_plot_width()
    plot_height = chart_plot_height()
    points_count = max(length(joins) - 1, 1)

    joins
    |> Enum.with_index()
    |> Enum.map(fn {%{count: count}, index} ->
      x = chart_left_padding() + index * (plot_width / points_count)
      y = chart_top_padding() + (plot_height - count / max(max_joins, 1) * plot_height)
      %{x: Float.round(x, 2), y: Float.round(y, 2)}
    end)
  end

  defp build_chart_path(joins, max_joins) do
    points = build_chart_coordinates(joins, max_joins)

    case points do
      [] ->
        ""

      [point] ->
        "M #{point.x - 3} #{point.y} L #{point.x + 3} #{point.y}"

      [first | _] ->
        tail =
          points
          |> Enum.chunk_every(2, 1, :discard)
          |> Enum.map_join(" ", fn [p0, p1] ->
            cx = Float.round((p0.x + p1.x) / 2, 2)
            "Q #{cx} #{p0.y} #{p1.x} #{p1.y}"
          end)

        "M #{first.x} #{first.y} #{tail}"
    end
  end

  defp chart_scale_lines(max_value) do
    steps = [1.0, 0.75, 0.5, 0.25, 0.0]
    safe_max = max(max_value, 1)
    plot_height = chart_plot_height()

    Enum.map(steps, fn step ->
      y = chart_top_padding() + (plot_height - step * plot_height)
      %{value: round(safe_max * step), y: Float.round(y, 2)}
    end)
  end

  defp chart_left_padding, do: 52
  defp chart_right_padding, do: 24
  defp chart_top_padding, do: 16
  defp chart_bottom_padding, do: 24
  defp chart_width, do: 940
  defp chart_height, do: 240
  defp chart_plot_width, do: chart_width() - chart_left_padding() - chart_right_padding()
  defp chart_plot_height, do: chart_height() - chart_top_padding() - chart_bottom_padding()
  defp chart_plot_end_x, do: chart_width() - chart_right_padding()
  defp chart_plot_end_y, do: chart_height() - chart_bottom_padding()
  defp chart_x_ticks_count, do: 11

  defp chart_x_axis_ticks(from_datetime, to_datetime, granularity) do
    total_seconds =
      to_datetime
      |> NaiveDateTime.diff(from_datetime, :second)
      |> max(0)

    ticks_count = chart_x_ticks_count()
    max_index = max(ticks_count - 1, 1)

    Enum.map(0..(ticks_count - 1), fn index ->
      ratio = index / max_index
      seconds_offset = round(total_seconds * ratio)
      tick_datetime = NaiveDateTime.add(from_datetime, seconds_offset, :second)
      x = Float.round(chart_left_padding() + ratio * chart_plot_width(), 2)

      anchor =
        cond do
          index == 0 -> "start"
          index == max_index -> "end"
          true -> "middle"
        end

      %{x: x, anchor: anchor, label: format_axis_datetime(tick_datetime, granularity)}
    end)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <% registrations_granularity = chart_granularity(@registrations_window) %>
    <% games_granularity = chart_granularity(@games_window) %>
    <% active_users_granularity = chart_granularity(@active_users_window) %>
    <div class="container-fluid px-0">
      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-4">
        <h1 class="text-white mb-1">Codebattle Admin Dashboard</h1>
        <p class="cb-text mb-4">
          Operational overview with real-time platform totals, user growth, and activity trends.
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
            <h3 class="text-white mb-0">{chart_title(registrations_granularity)}</h3>
            <%= if @registrations_chart.ok? do %>
              <span class="cb-text">
                {format_chart_datetime(
                  @registrations_chart.result.joins_from,
                  @registrations_chart.result.granularity
                )} to {format_chart_datetime(
                  @registrations_chart.result.joins_to,
                  @registrations_chart.result.granularity
                )} • Total: {@registrations_chart.result.total_joins}
              </span>
            <% else %>
              <span class="cb-text">Loading chart data...</span>
            <% end %>
          </div>

          <%= if @registrations_chart.ok? do %>
            <svg
              viewBox="0 0 940 240"
              width="100%"
              height="240"
              role="img"
              aria-label="User joins trend"
            >
              <rect x="0" y="0" width="940" height="240" rx="8" ry="8" fill="#15151c"></rect>
              <%= for line <- chart_scale_lines(@registrations_chart.result.max_joins) do %>
                <line
                  x1={chart_left_padding()}
                  y1={line.y}
                  x2={chart_plot_end_x()}
                  y2={line.y}
                  stroke={chart_grid_color()}
                  stroke-width="1"
                >
                </line>
                <text
                  x="46"
                  y={line.y + 4}
                  fill={chart_axis_text_color()}
                  font-size="11"
                  text-anchor="end"
                >
                  {line.value}
                </text>
              <% end %>
              <path
                d={@registrations_chart.result.joins_chart_path}
                fill="none"
                stroke={chart_series_color(:registrations)}
                stroke-width="3"
                stroke-linejoin="round"
                stroke-linecap="round"
              >
              </path>
              <line
                x1={chart_left_padding()}
                y1={chart_plot_end_y()}
                x2={chart_plot_end_x()}
                y2={chart_plot_end_y()}
                stroke={chart_axis_text_color()}
                stroke-width="1"
              >
              </line>
              <%= for tick <- chart_x_axis_ticks(
                @registrations_chart.result.joins_from,
                @registrations_chart.result.joins_to,
                @registrations_chart.result.granularity
              ) do %>
                <line
                  x1={tick.x}
                  y1={chart_plot_end_y()}
                  x2={tick.x}
                  y2={chart_plot_end_y() + 4}
                  stroke={chart_axis_text_color()}
                  stroke-width="1"
                >
                </line>
                <text
                  x={tick.x}
                  y={chart_height() - 6}
                  fill={chart_axis_text_color()}
                  font-size="11"
                  text-anchor={tick.anchor}
                >
                  {tick.label}
                </text>
              <% end %>
            </svg>

            <div class="text-center cb-text mt-1">
              {peak_label(@registrations_chart.result.granularity)}: {@registrations_chart.result.max_joins}
            </div>
          <% else %>
            <div class="text-center py-5" style={"color: #{chart_secondary_text_color()};"}>
              Chart is loading...
            </div>
          <% end %>

          <div class="d-flex flex-wrap justify-content-center mt-3">
            <%= for window_key <- @chart_window_order do %>
              <% window = @chart_windows[window_key] %>
              <button
                type="button"
                phx-click="set_chart_window"
                phx-value-window={window_key}
                phx-value-target="registrations"
                class={window_button_class(window_key, @registrations_window)}
                style={window_button_style(window_key, @registrations_window, :registrations)}
              >
                {window.label} ({window.bucket_label})
              </button>
            <% end %>
          </div>
        </div>

        <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mt-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <h3 class="text-white mb-0">{games_chart_title(games_granularity)}</h3>
            <%= if @games_chart.ok? do %>
              <span class="cb-text">
                {format_chart_datetime(
                  @games_chart.result.games_from,
                  @games_chart.result.granularity
                )} to {format_chart_datetime(
                  @games_chart.result.games_to,
                  @games_chart.result.granularity
                )} • Total: {@games_chart.result.total_games}
              </span>
            <% else %>
              <span class="cb-text">Loading chart data...</span>
            <% end %>
          </div>

          <%= if @games_chart.ok? do %>
            <svg viewBox="0 0 940 240" width="100%" height="240" role="img" aria-label="Games trend">
              <rect x="0" y="0" width="940" height="240" rx="8" ry="8" fill="#15151c"></rect>
              <%= for line <- chart_scale_lines(@games_chart.result.max_games) do %>
                <line
                  x1={chart_left_padding()}
                  y1={line.y}
                  x2={chart_plot_end_x()}
                  y2={line.y}
                  stroke={chart_grid_color()}
                  stroke-width="1"
                >
                </line>
                <text
                  x="46"
                  y={line.y + 4}
                  fill={chart_axis_text_color()}
                  font-size="11"
                  text-anchor="end"
                >
                  {line.value}
                </text>
              <% end %>
              <path
                d={@games_chart.result.games_chart_path}
                fill="none"
                stroke={chart_series_color(:games)}
                stroke-width="3"
                stroke-linejoin="round"
                stroke-linecap="round"
              >
              </path>
              <line
                x1={chart_left_padding()}
                y1={chart_plot_end_y()}
                x2={chart_plot_end_x()}
                y2={chart_plot_end_y()}
                stroke={chart_axis_text_color()}
                stroke-width="1"
              >
              </line>
              <%= for tick <- chart_x_axis_ticks(
                @games_chart.result.games_from,
                @games_chart.result.games_to,
                @games_chart.result.granularity
              ) do %>
                <line
                  x1={tick.x}
                  y1={chart_plot_end_y()}
                  x2={tick.x}
                  y2={chart_plot_end_y() + 4}
                  stroke={chart_axis_text_color()}
                  stroke-width="1"
                >
                </line>
                <text
                  x={tick.x}
                  y={chart_height() - 6}
                  fill={chart_axis_text_color()}
                  font-size="11"
                  text-anchor={tick.anchor}
                >
                  {tick.label}
                </text>
              <% end %>
            </svg>

            <div class="text-center cb-text mt-1">
              {peak_label(@games_chart.result.granularity)}: {@games_chart.result.max_games}
            </div>
          <% else %>
            <div class="text-center py-5" style={"color: #{chart_secondary_text_color()};"}>
              Chart is loading...
            </div>
          <% end %>

          <div class="d-flex flex-wrap justify-content-center mt-3">
            <%= for window_key <- @chart_window_order do %>
              <% window = @chart_windows[window_key] %>
              <button
                type="button"
                phx-click="set_chart_window"
                phx-value-window={window_key}
                phx-value-target="games"
                class={window_button_class(window_key, @games_window)}
                style={window_button_style(window_key, @games_window, :games)}
              >
                {window.label} ({window.bucket_label})
              </button>
            <% end %>
          </div>
        </div>

        <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mt-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <h3 class="text-white mb-0">{active_users_chart_title(active_users_granularity)}</h3>
            <%= if @active_users_chart.ok? do %>
              <span class="cb-text">
                {format_chart_datetime(
                  @active_users_chart.result.active_users_from,
                  @active_users_chart.result.granularity
                )} to {format_chart_datetime(
                  @active_users_chart.result.active_users_to,
                  @active_users_chart.result.granularity
                )} • Total: {@active_users_chart.result.total_active_users}
              </span>
            <% else %>
              <span class="cb-text">Loading chart data...</span>
            <% end %>
          </div>

          <%= if @active_users_chart.ok? do %>
            <svg
              viewBox="0 0 940 240"
              width="100%"
              height="240"
              role="img"
              aria-label="Unique active users trend"
            >
              <rect x="0" y="0" width="940" height="240" rx="8" ry="8" fill="#15151c"></rect>
              <%= for line <- chart_scale_lines(@active_users_chart.result.max_active_users) do %>
                <line
                  x1={chart_left_padding()}
                  y1={line.y}
                  x2={chart_plot_end_x()}
                  y2={line.y}
                  stroke={chart_grid_color()}
                  stroke-width="1"
                >
                </line>
                <text
                  x="46"
                  y={line.y + 4}
                  fill={chart_axis_text_color()}
                  font-size="11"
                  text-anchor="end"
                >
                  {line.value}
                </text>
              <% end %>
              <path
                d={@active_users_chart.result.active_users_chart_path}
                fill="none"
                stroke={chart_series_color(:active_users)}
                stroke-width="3"
                stroke-linejoin="round"
                stroke-linecap="round"
              >
              </path>
              <line
                x1={chart_left_padding()}
                y1={chart_plot_end_y()}
                x2={chart_plot_end_x()}
                y2={chart_plot_end_y()}
                stroke={chart_axis_text_color()}
                stroke-width="1"
              >
              </line>
              <%= for tick <- chart_x_axis_ticks(
                @active_users_chart.result.active_users_from,
                @active_users_chart.result.active_users_to,
                @active_users_chart.result.granularity
              ) do %>
                <line
                  x1={tick.x}
                  y1={chart_plot_end_y()}
                  x2={tick.x}
                  y2={chart_plot_end_y() + 4}
                  stroke={chart_axis_text_color()}
                  stroke-width="1"
                >
                </line>
                <text
                  x={tick.x}
                  y={chart_height() - 6}
                  fill={chart_axis_text_color()}
                  font-size="11"
                  text-anchor={tick.anchor}
                >
                  {tick.label}
                </text>
              <% end %>
            </svg>

            <div class="text-center cb-text mt-1">
              {peak_label(@active_users_chart.result.granularity)}: {@active_users_chart.result.max_active_users}
            </div>
          <% else %>
            <div class="text-center py-5" style={"color: #{chart_secondary_text_color()};"}>
              Chart is loading...
            </div>
          <% end %>

          <div class="d-flex flex-wrap justify-content-center mt-3">
            <%= for window_key <- @chart_window_order do %>
              <% window = @chart_windows[window_key] %>
              <button
                type="button"
                phx-click="set_chart_window"
                phx-value-window={window_key}
                phx-value-target="active_users"
                class={window_button_class(window_key, @active_users_window)}
                style={window_button_style(window_key, @active_users_window, :active_users)}
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
