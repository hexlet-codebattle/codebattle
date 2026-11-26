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

  @metrics [
    {"registrations", "Registrations"},
    {"games", "Games created"},
    {"active_users", "Active players"}
  ]
  @chart_windows [
    {"last_week", "7 days", :hour, "Hourly"},
    {"last_three_months", "3 months", :day, "Daily"},
    {"last_year", "1 year", :week, "Weekly"},
    {"all_time", "All time", :month, "Monthly"}
  ]
  @default_metric "registrations"
  @default_chart_window "last_three_months"
  @chart_window_config Map.new(@chart_windows, fn {key, _label, granularity, bucket_label} ->
                         {key, %{granularity: granularity, bucket_label: bucket_label}}
                       end)

  @chart_width 850
  @chart_height 258
  @chart_left 64
  @chart_right 828
  @chart_top 20
  @chart_bottom 222

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       stats: %{
         users: Repo.aggregate(User, :count, :id),
         tasks: Repo.aggregate(Task, :count, :id),
         games: Repo.aggregate(Game, :count, :id),
         tournaments: Repo.aggregate(Tournament, :count, :id)
       },
       metrics: @metrics,
       chart_windows: @chart_windows,
       chart_selection: nil,
       chart: AsyncResult.loading()
     )}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    metric =
      case List.keyfind(@metrics, params["metric"], 0) do
        {key, _label} -> key
        nil -> @default_metric
      end

    windows =
      Map.new(@metrics, fn {key, _label} ->
        {key, normalize_chart_window(params[key <> "_window"])}
      end)

    window = Map.fetch!(windows, metric)
    selection = {metric, window}
    socket = assign(socket, metric: metric, windows: windows, bucket_label: @chart_window_config[window].bucket_label)

    if selection == socket.assigns.chart_selection do
      {:noreply, socket}
    else
      {:noreply, load_chart(assign(socket, :chart_selection, selection))}
    end
  end

  @impl true
  def handle_event("retry_chart", _params, socket), do: {:noreply, load_chart(socket)}

  defp load_chart(socket) do
    {metric, window} = socket.assigns.chart_selection
    assign_async(socket, :chart, fn -> {:ok, %{chart: build_chart(metric, window)}} end, reset: true)
  end

  defp normalize_chart_window(window) when is_map_key(@chart_window_config, window), do: window
  defp normalize_chart_window(_window), do: @default_chart_window

  defp chart_path(metric, windows) do
    params = for {key, window} <- windows, window != @default_chart_window, into: %{}, do: {key <> "_window", window}
    params = if metric == @default_metric, do: params, else: Map.put(params, "metric", metric)

    if map_size(params) == 0, do: "/admin", else: "/admin?" <> URI.encode_query(params)
  end

  defp build_chart(metric, window) do
    %{joins: buckets, from: from, to: to, granularity: granularity} =
      case metric do
        "registrations" -> list_user_joins(window)
        "games" -> list_game_creations(window)
        "active_users" -> list_active_user_joins(window)
      end

    peak = buckets |> Enum.map(& &1.count) |> Enum.max(fn -> 0 end)
    scale_step = max(ceil(peak / 4), 1)
    points = chart_points(buckets, scale_step * 4)

    %{
      buckets: buckets,
      from: from,
      to: to,
      granularity: granularity,
      peak: peak,
      summary: if(metric == "active_users", do: peak, else: Enum.sum_by(buckets, & &1.count)),
      scale: for(index <- 0..4, do: %{value: scale_step * index, y: chart_y(index, 4)}),
      ticks: chart_ticks(buckets, points, granularity),
      points: Enum.map_join(points, " ", fn {x, y} -> "#{x},#{y}" end),
      first: List.first(points),
      last: List.last(points)
    }
  end

  defp chart_points(buckets, scale_max) do
    intervals = max(length(buckets) - 1, 1)

    buckets
    |> Enum.with_index()
    |> Enum.map(fn {%{count: count}, index} ->
      x = @chart_left + index / intervals * (@chart_right - @chart_left)
      {Float.round(x, 2), chart_y(count, scale_max)}
    end)
  end

  defp chart_y(count, scale_max) do
    Float.round(@chart_bottom - count / scale_max * (@chart_bottom - @chart_top), 2)
  end

  defp chart_ticks([], _points, _granularity), do: []

  defp chart_ticks(buckets, points, granularity) do
    last_index = length(buckets) - 1
    indices = Enum.uniq(for step <- 0..4, do: round(last_index * step / 4))

    Enum.map(indices, fn index ->
      {x, _y} = Enum.at(points, index)
      %{bucket: bucket} = Enum.at(buckets, index)
      %{x: x, label: format_axis_datetime(bucket, granularity), anchor: tick_anchor(index, last_index)}
    end)
  end

  defp tick_anchor(0, _last_index), do: "start"
  defp tick_anchor(index, index), do: "end"
  defp tick_anchor(_index, _last_index), do: "middle"

  defp list_user_joins(window_key) do
    config = @chart_window_config[window_key]
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
    config = @chart_window_config[window_key]
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
    config = @chart_window_config[window_key]
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
    config = @chart_window_config[window_key]
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

  defp format_chart_datetime(datetime, :hour), do: Calendar.strftime(datetime, "%b %-d, %Y %H:%M")
  defp format_chart_datetime(datetime, :month), do: Calendar.strftime(datetime, "%b %Y")
  defp format_chart_datetime(datetime, _granularity), do: Calendar.strftime(datetime, "%b %-d, %Y")

  defp format_axis_datetime(datetime, :hour), do: Calendar.strftime(datetime, "%b %-d %H:%M")
  defp format_axis_datetime(datetime, :month), do: Calendar.strftime(datetime, "%b '%y")
  defp format_axis_datetime(datetime, _granularity), do: Calendar.strftime(datetime, "%b %-d")

  defp format_count(count), do: count |> Integer.to_string() |> String.replace(~r/\B(?=(\d{3})+(?!\d))/, ",")

  @impl true
  def render(assigns) do
    ~H"""
    <div class="admin-overview">
      <header class="admin-overview-header">
        <h1>Admin overview</h1>
        <a href="/admin/events/new" class="admin-action-primary"><span aria-hidden="true">+</span>
        Create event</a>
      </header>

      <section class="admin-totals" aria-label="Platform totals">
        <.total label="Users" count={@stats.users} href="/admin/users" />
        <.total label="Tasks" count={@stats.tasks} href="/tasks" />
        <.total
          label="Games created"
          count={@stats.games}
          href="/admin/games"
          link_label="View online games"
        />
        <.total label="Tournaments" count={@stats.tournaments} href="/admin/tournaments" />
      </section>

      <div class="admin-overview-grid">
        <section class="admin-card admin-activity" aria-labelledby="admin-activity-title">
          <div class="admin-card-header">
            <h2 id="admin-activity-title">Platform activity</h2>
            <nav class="admin-ranges" aria-label="Activity date range">
              <.link
                :for={{key, label, _granularity, _bucket_label} <- @chart_windows}
                patch={chart_path(@metric, Map.put(@windows, @metric, key))}
                aria-current={if @windows[@metric] == key, do: "true"}
              >
                {label}
              </.link>
            </nav>
          </div>
          <nav class="admin-metrics" aria-label="Activity metric">
            <.link
              :for={{key, label} <- @metrics}
              patch={chart_path(key, @windows)}
              aria-current={if @metric == key, do: "true"}
            >
              {label}
            </.link>
          </nav>
          <.async_result :let={chart} assign={@chart}>
            <:loading>
              <div class="admin-chart-message" role="status">Loading activity…</div>
            </:loading>
            <:failed>
              <div class="admin-chart-message" role="status">
                <p>Activity data could not be loaded.</p>
                <button type="button" class="admin-action-secondary" phx-click="retry_chart">Try again</button>
              </div>
            </:failed>
            <div id={"admin-chart-#{@metric}"} class="admin-chart">
              <div class="admin-chart-header">
                <div>
                  <div class="admin-chart-value">{format_count(chart.summary)}</div>
                  <div class="admin-chart-caption">
                    {if @metric == "active_users", do: "#{@bucket_label} peak", else: "Total in range"}
                  </div>
                </div>
                <div class="admin-chart-period">
                  <span>{@bucket_label} · UTC</span>
                  <span>
                    {format_chart_datetime(chart.from, chart.granularity)} – {format_chart_datetime(
                      chart.to,
                      chart.granularity
                    )}
                  </span>
                </div>
              </div>

              <div :if={chart.peak == 0} class="admin-chart-message">
                No activity recorded in this range.
              </div>
              <.trend_plot
                :if={chart.peak > 0}
                chart={chart}
                label={List.keyfind!(@metrics, @metric, 0) |> elem(1)}
              />
              <p :if={chart.peak > 0} class="admin-chart-caption mt-2 mb-0">
                <%= if @metric == "active_users" do %>
                  Unique players are counted separately in each interval.
                <% else %>
                  Peak per interval: {format_count(chart.peak)}
                <% end %>
              </p>
              <details :if={chart.peak > 0} class="admin-chart-data">
                <summary>View chart data</summary>
                <div
                  class="table-responsive admin-chart-table"
                  tabindex="0"
                  role="region"
                  aria-label="Chart data"
                >
                  <table class="table mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Interval start (UTC)</th><th scope="col">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr :for={bucket <- Enum.reverse(chart.buckets)}>
                        <th scope="row">{format_chart_datetime(bucket.bucket, chart.granularity)}</th>
                        <td>{format_count(bucket.count)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </.async_result>
        </section>

        <section class="admin-card admin-quick-links" aria-labelledby="admin-quick-links-title">
          <div class="admin-card-header">
            <h2 id="admin-quick-links-title">Quick tools</h2>
          </div>
          <div class="admin-tool-list">
            <.tool
              href="/admin/feedback"
              short="FB"
              label="Feedback inbox"
              description="Review reports from players"
            />
            <.tool
              href="/admin/code-checks?tab=failures"
              short="CC"
              label="Code check failures"
              description="Investigate failed runner checks"
            />
            <.tool
              href="/admin/connections"
              short="CN"
              label="Live connections"
              description="Inspect connected sessions"
            />
            <.tool
              href="/admin/tournament_duplicator"
              short="DT"
              label="Duplicate tournament"
              description="Create copies of an existing tournament"
            />
          </div>
        </section>
      </div>

      <.live_component module={CodebattleWeb.Live.Admin.OnboardingFunnel} id="onboarding-funnel" />
    </div>
    """
  end

  attr :label, :string, required: true
  attr :count, :integer, required: true
  attr :href, :string, required: true
  attr :link_label, :string, default: nil

  defp total(assigns) do
    ~H"""
    <a
      class="admin-card admin-total"
      href={@href}
      title={@link_label}
      aria-label={@link_label && "#{@label}, #{format_count(@count)}. #{@link_label}"}
    >
      <span class="admin-total-label">{@label}</span>
      <span class="admin-total-value">{format_count(@count)}</span>
      <span class="admin-total-arrow" aria-hidden="true"></span>
    </a>
    """
  end

  attr :href, :string, required: true
  attr :short, :string, required: true
  attr :label, :string, required: true
  attr :description, :string, required: true

  defp tool(assigns) do
    ~H"""
    <a href={@href} class="admin-tool">
      <span class="admin-tool-icon" aria-hidden="true">{@short}</span>
      <span>
        <strong>{@label}</strong>
        <small>{@description}</small>
      </span>
      <span class="admin-tool-arrow" aria-hidden="true"></span>
    </a>
    """
  end

  attr :chart, :map, required: true
  attr :label, :string, required: true

  defp trend_plot(assigns) do
    assigns =
      assign(assigns,
        width: @chart_width,
        height: @chart_height,
        left: @chart_left,
        right: @chart_right,
        bottom: @chart_bottom
      )

    ~H"""
    <svg
      viewBox={"0 0 #{@width} #{@height}"}
      class="admin-chart-plot"
      role="img"
      aria-label={"#{@label} over time"}
    >
      <defs>
        <linearGradient id="admin-chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity=".25"></stop>
          <stop offset="100%" stop-color="currentColor" stop-opacity=".02"></stop>
        </linearGradient>
      </defs>
      <g :for={line <- @chart.scale} class="admin-chart-scale">
        <line x1={@left} y1={line.y} x2={@right} y2={line.y} vector-effect="non-scaling-stroke">
        </line>
        <text x={@left - 10} y={line.y + 5} text-anchor="end">{format_count(line.value)}</text>
      </g>
      <polygon
        points={"#{elem(@chart.first, 0)},#{@bottom} #{@chart.points} #{elem(@chart.last, 0)},#{@bottom}"}
        fill="url(#admin-chart-fill)"
      >
      </polygon>
      <polyline points={@chart.points} fill="none" vector-effect="non-scaling-stroke"></polyline>
      <circle cx={elem(@chart.last, 0)} cy={elem(@chart.last, 1)} r="4"></circle>
      <text
        :for={{tick, index} <- Enum.with_index(@chart.ticks)}
        class={[
          "admin-chart-tick",
          rem(index, 2) == 1 && index != length(@chart.ticks) - 1 && "admin-chart-tick-detail"
        ]}
        x={tick.x}
        y={@bottom + 25}
        text-anchor={tick.anchor}
      >
        {tick.label}
      </text>
    </svg>
    """
  end
end
