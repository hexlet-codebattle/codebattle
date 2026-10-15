defmodule CodebattleWeb.Live.Admin.CodeCheck.IndexView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.CodeCheck.Run
  alias Codebattle.Repo

  @refresh_intervals %{"3" => 3, "15" => 15, "30" => 30}
  @refresh_order ["3", "15", "30"]
  @default_refresh_interval "15"

  @windows %{
    "10m" => %{label: "10 Minutes", seconds: 10 * 60},
    "30m" => %{label: "30 Minutes", seconds: 30 * 60},
    "1h" => %{label: "1 Hour", seconds: 60 * 60},
    "2h" => %{label: "2 Hours", seconds: 2 * 60 * 60},
    "6h" => %{label: "6 Hours", seconds: 6 * 60 * 60},
    "1d" => %{label: "1 Day", seconds: 24 * 60 * 60},
    "3d" => %{label: "3 Days", seconds: 3 * 24 * 60 * 60},
    "7d" => %{label: "7 Days", seconds: 7 * 24 * 60 * 60},
    "14d" => %{label: "14 Days", seconds: 14 * 24 * 60 * 60},
    "30d" => %{label: "30 Days", seconds: 30 * 24 * 60 * 60}
  }
  @window_order ["10m", "30m", "1h", "2h", "6h", "1d", "3d", "7d", "14d", "30d"]
  @default_window "10m"
  @tabs %{"live" => "Code Checks Live", "failures" => "Run Failures"}
  @tab_order ["live", "failures"]
  @default_tab "live"
  @failure_results ~w(error service_failure service_timeout timeout)

  @default_top_langs 3

  @main_chart %{width: 940, height: 320, left: 52, right: 24, top: 16, bottom: 30, ticks: 6}
  @mini_chart %{width: 420, height: 210, left: 62, right: 16, top: 12, bottom: 24, ticks: 4}

  @impl true
  def mount(params, _session, socket) do
    tab = normalize_tab(params["tab"])
    window = normalize_window(params["window"])
    refresh_interval = normalize_refresh_interval(params["interval"])
    selected_langs = parse_langs_param(params["langs"])

    stats = build_stats(window, selected_langs)
    failure_runs = build_failure_runs(window)

    socket =
      socket
      |> assign(:layout, {CodebattleWeb.LayoutView, :admin})
      |> assign(:tab, tab)
      |> assign(:tabs, @tabs)
      |> assign(:tab_order, @tab_order)
      |> assign(:window, window)
      |> assign(:windows, @windows)
      |> assign(:window_order, @window_order)
      |> assign(:refresh_interval, refresh_interval)
      |> assign(:refresh_intervals, @refresh_intervals)
      |> assign(:refresh_order, @refresh_order)
      |> assign(:selected_langs, stats.selected_langs)
      |> assign(:stats, stats)
      |> assign(:failure_runs, failure_runs)
      |> assign(:refresh_timer_ref, nil)

    socket =
      if connected?(socket) do
        schedule_refresh(socket)
      else
        socket
      end

    {:ok, socket}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    tab = normalize_tab(params["tab"])
    window = normalize_window(params["window"])
    refresh_interval = normalize_refresh_interval(params["interval"])
    selected_langs = parse_langs_param(params["langs"])

    stats = build_stats(window, selected_langs)
    failure_runs = build_failure_runs(window)

    socket =
      socket
      |> assign(:tab, tab)
      |> assign(:window, window)
      |> assign(:refresh_interval, refresh_interval)
      |> assign(:selected_langs, stats.selected_langs)
      |> assign(:stats, stats)
      |> assign(:failure_runs, failure_runs)

    socket =
      if connected?(socket) do
        schedule_refresh(socket)
      else
        socket
      end

    {:noreply, socket}
  end

  @impl true
  def handle_event("set_window", %{"window" => window}, socket) do
    {:noreply,
     push_patch(socket,
       to:
         build_path(
           socket.assigns.tab,
           normalize_window(window),
           socket.assigns.refresh_interval,
           socket.assigns.selected_langs
         )
     )}
  end

  @impl true
  def handle_event("set_tab", %{"tab" => tab}, socket) do
    {:noreply,
     push_patch(socket,
       to:
         build_path(
           normalize_tab(tab),
           socket.assigns.window,
           socket.assigns.refresh_interval,
           socket.assigns.selected_langs
         )
     )}
  end

  @impl true
  def handle_event("set_interval", %{"interval" => interval}, socket) do
    {:noreply,
     push_patch(socket,
       to:
         build_path(
           socket.assigns.tab,
           socket.assigns.window,
           normalize_refresh_interval(interval),
           socket.assigns.selected_langs
         )
     )}
  end

  @impl true
  def handle_event("toggle_lang", %{"lang" => lang}, socket) do
    selected_langs = toggle_lang(socket.assigns.selected_langs, lang)

    {:noreply,
     push_patch(socket,
       to:
         build_path(
           socket.assigns.tab,
           socket.assigns.window,
           socket.assigns.refresh_interval,
           selected_langs
         )
     )}
  end

  @impl true
  def handle_event("reset_langs", _params, socket) do
    {:noreply,
     push_patch(socket,
       to: build_path(socket.assigns.tab, socket.assigns.window, socket.assigns.refresh_interval, [])
     )}
  end

  @impl true
  def handle_info(:refresh, socket) do
    stats = build_stats(socket.assigns.window, socket.assigns.selected_langs)
    failure_runs = build_failure_runs(socket.assigns.window)

    socket =
      socket
      |> assign(:selected_langs, stats.selected_langs)
      |> assign(:stats, stats)
      |> assign(:failure_runs, failure_runs)
      |> schedule_refresh()

    {:noreply, socket}
  end

  defp normalize_window(nil), do: @default_window
  defp normalize_window(window) when is_map_key(@windows, window), do: window
  defp normalize_window(_), do: @default_window

  defp normalize_tab(nil), do: @default_tab
  defp normalize_tab(tab) when is_map_key(@tabs, tab), do: tab
  defp normalize_tab(_), do: @default_tab

  defp normalize_refresh_interval(nil), do: @default_refresh_interval

  defp normalize_refresh_interval(interval) when is_map_key(@refresh_intervals, interval), do: interval

  defp normalize_refresh_interval(_), do: @default_refresh_interval

  defp parse_langs_param(nil), do: []

  defp parse_langs_param(value) when is_binary(value) do
    value
    |> String.split(",", trim: true)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end

  defp parse_langs_param(_), do: []

  defp build_stats(window_key, selected_langs) do
    window = @windows[window_key]
    now = DateTime.truncate(DateTime.utc_now(), :second)
    from_datetime = DateTime.add(now, -window.seconds, :second)

    base_query = from(run in Run, where: run.started_at >= ^from_datetime)

    lang_rows =
      Repo.all(
        from(run in base_query,
          group_by: run.lang,
          order_by: [desc: count(run.lang)],
          select: %{
            lang: run.lang,
            checks_count: count(run.lang),
            success_count: fragment("sum(case when ? in ('ok', 'failure') then 1 else 0 end)", run.result),
            timeout_count: fragment("sum(case when ? in ('service_timeout', 'timeout') then 1 else 0 end)", run.result),
            failure_count:
              fragment(
                "sum(case when ? not in ('ok', 'failure', 'service_timeout', 'timeout') then 1 else 0 end)",
                run.result
              )
          }
        )
      )

    all_langs = Enum.map(lang_rows, & &1.lang)
    effective_selected_langs = choose_effective_langs(selected_langs, all_langs)

    filtered_base_query =
      if effective_selected_langs == [] do
        base_query
      else
        from(run in base_query, where: run.lang in ^effective_selected_langs)
      end

    totals =
      Repo.one(
        from(run in filtered_base_query,
          select: %{
            checks_count: count(run.id),
            avg_duration_ms: type(avg(run.duration_ms), :float),
            success_count: fragment("sum(case when ? in ('ok', 'failure') then 1 else 0 end)", run.result),
            timeout_count: fragment("sum(case when ? in ('service_timeout', 'timeout') then 1 else 0 end)", run.result),
            failure_count:
              fragment(
                "sum(case when ? not in ('ok', 'failure', 'service_timeout', 'timeout') then 1 else 0 end)",
                run.result
              )
          }
        )
      ) || %{checks_count: 0, avg_duration_ms: 0.0, success_count: 0, failure_count: 0, timeout_count: 0}

    grouped_series =
      Repo.all(
        from(run in filtered_base_query,
          group_by: fragment("date_trunc('minute', ?)", run.started_at),
          order_by: fragment("1"),
          select: %{
            bucket: fragment("date_trunc('minute', ?)", run.started_at),
            checks_count: count(run.id),
            avg_duration_ms: type(avg(run.duration_ms), :float)
          }
        )
      )

    series = fill_empty_buckets(grouped_series, from_datetime, now)

    main_chart =
      series
      |> build_chart_payload(@main_chart)
      |> Map.put(:series, series)

    lang_charts = build_lang_charts(filtered_base_query, effective_selected_langs, from_datetime, now)

    %{
      totals: totals,
      lang_rows: lang_rows,
      selected_langs: effective_selected_langs,
      main_chart: main_chart,
      lang_charts: lang_charts,
      updated_at: now,
      from_datetime: from_datetime
    }
  end

  defp build_failure_runs(window_key) do
    window = @windows[window_key]
    now = DateTime.truncate(DateTime.utc_now(), :second)
    from_datetime = DateTime.add(now, -window.seconds, :second)

    Repo.all(
      from(run in Run,
        where:
          run.started_at >= ^from_datetime and run.result in ^@failure_results and
            not is_nil(run.error_description),
        order_by: [desc: run.started_at],
        limit: 100
      )
    )
  end

  defp choose_effective_langs(selected_langs, all_langs) do
    if all_langs == [] do
      []
    else
      filtered = Enum.filter(selected_langs, &(&1 in all_langs))

      if filtered == [] do
        Enum.take(all_langs, @default_top_langs)
      else
        filtered
      end
    end
  end

  defp build_lang_charts(filtered_base_query, selected_langs, from_datetime, now) do
    rows =
      Repo.all(
        from(run in filtered_base_query,
          group_by: [run.lang, fragment("date_trunc('minute', ?)", run.started_at)],
          order_by: [run.lang, fragment("date_trunc('minute', ?)", run.started_at)],
          select: %{
            lang: run.lang,
            bucket: fragment("date_trunc('minute', ?)", run.started_at),
            checks_count: count(run.id),
            avg_duration_ms: type(avg(run.duration_ms), :float),
            max_duration_ms: max(run.duration_ms)
          }
        )
      )

    rows_by_lang = Enum.group_by(rows, & &1.lang)
    percentiles_by_lang = lang_percentiles(filtered_base_query)

    selected_langs
    |> Enum.map(fn lang ->
      lang_series = fill_empty_buckets(Map.get(rows_by_lang, lang, []), from_datetime, now)
      chart = build_lang_chart_payload(lang_series, @mini_chart)
      total_checks = Enum.sum(Enum.map(lang_series, & &1.checks_count))
      percentiles = Map.get(percentiles_by_lang, lang, default_percentiles())

      %{
        lang: lang,
        total_checks: total_checks,
        avg_duration_ms: avg_value(lang_series),
        peak_duration_ms: Enum.max(Enum.map(lang_series, &Map.get(&1, :max_duration_ms, 0)), fn -> 0 end),
        percentiles: percentiles,
        chart: Map.put(chart, :series, lang_series)
      }
    end)
    |> Enum.sort_by(fn chart -> {-chart.total_checks, chart.lang} end)
  end

  defp lang_percentiles(filtered_base_query) do
    from(run in filtered_base_query,
      group_by: run.lang,
      select: %{
        lang: run.lang,
        p95: fragment("percentile_cont(0.95) within group (order by ?)", run.duration_ms),
        p75: fragment("percentile_cont(0.75) within group (order by ?)", run.duration_ms),
        p50: fragment("percentile_cont(0.50) within group (order by ?)", run.duration_ms)
      }
    )
    |> Repo.all()
    |> Map.new(fn row ->
      {row.lang,
       %{
         p95: round_percentile(row.p95),
         p75: round_percentile(row.p75),
         p50: round_percentile(row.p50)
       }}
    end)
  end

  defp round_percentile(nil), do: 0
  defp round_percentile(value) when is_float(value), do: round(value)
  defp round_percentile(value) when is_integer(value), do: value

  defp default_percentiles do
    %{p95: 0, p75: 0, p50: 0}
  end

  defp avg_value([]), do: 0.0

  defp avg_value(series) do
    values = Enum.map(series, &(&1.avg_duration_ms || 0.0))

    if values == [] do
      0.0
    else
      Enum.sum(values) / length(values)
    end
  end

  defp fill_empty_buckets(grouped_series, from_datetime, to_datetime) do
    rows_map =
      Map.new(grouped_series, fn row ->
        {normalize_to_naive_minute(row.bucket), row}
      end)

    from_bucket = normalize_to_naive_minute(from_datetime)
    to_bucket = normalize_to_naive_minute(to_datetime)

    from_bucket
    |> datetime_range(to_bucket)
    |> Enum.map(fn bucket ->
      case Map.get(rows_map, bucket) do
        nil ->
          %{bucket: bucket, checks_count: 0, avg_duration_ms: 0.0, max_duration_ms: 0}

        row ->
          %{
            bucket: bucket,
            checks_count: row.checks_count,
            avg_duration_ms: row.avg_duration_ms || 0.0,
            max_duration_ms: Map.get(row, :max_duration_ms, 0) || 0
          }
      end
    end)
  end

  defp datetime_range(from_datetime, to_datetime), do: do_datetime_range(from_datetime, to_datetime, [])

  defp do_datetime_range(current, to_datetime, acc) do
    if NaiveDateTime.after?(current, to_datetime) do
      Enum.reverse(acc)
    else
      do_datetime_range(NaiveDateTime.add(current, 60, :second), to_datetime, [current | acc])
    end
  end

  defp normalize_to_naive_minute(%DateTime{} = datetime),
    do: datetime |> DateTime.to_naive() |> normalize_to_naive_minute()

  defp normalize_to_naive_minute(%NaiveDateTime{} = datetime), do: %{datetime | second: 0, microsecond: {0, 0}}

  defp build_chart_payload(series, dims) do
    max_avg_duration = series |> Enum.map(&(&1.avg_duration_ms || 0.0)) |> Enum.max(fn -> 1.0 end)

    %{
      dims: dims,
      max_avg_duration: max_avg_duration,
      path: build_chart_path(series, max_avg_duration, dims),
      y_lines: chart_scale_lines(max_avg_duration, dims),
      x_ticks: chart_x_axis_ticks(series, dims)
    }
  end

  defp build_lang_chart_payload(series, dims) do
    max_duration =
      series
      |> Enum.map(fn row -> max((row.max_duration_ms || 0) * 1.0, row.avg_duration_ms || 0.0) end)
      |> Enum.max(fn -> 1.0 end)

    %{
      dims: dims,
      max_avg_duration: max_duration,
      duration_path: build_chart_path(series, max_duration, dims, :max_duration_ms),
      y_lines: chart_scale_lines(max_duration, dims),
      x_ticks: chart_x_axis_ticks(series, dims)
    }
  end

  defp build_chart_points(series, max_avg_duration, dims, metric_key) do
    points_count = max(length(series) - 1, 1)
    plot_width = plot_width(dims)
    plot_height = plot_height(dims)

    series
    |> Enum.with_index()
    |> Enum.map(fn {row, index} ->
      value = metric_value(row, metric_key)
      x = dims.left + index * (plot_width / points_count)
      y = dims.top + (plot_height - value / max(max_avg_duration, 1.0) * plot_height)
      %{x: Float.round(x, 2), y: Float.round(y, 2)}
    end)
  end

  defp build_chart_path(series, max_avg_duration, dims, metric_key \\ :avg_duration_ms) do
    points = build_chart_points(series, max_avg_duration, dims, metric_key)

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

  defp metric_value(row, :max_duration_ms), do: max((Map.get(row, :max_duration_ms, 0) || 0) * 1.0, 0.0)
  defp metric_value(row, :avg_duration_ms), do: max(row.avg_duration_ms || 0.0, 0.0)

  defp chart_scale_lines(max_value, dims) do
    steps = [1.0, 0.75, 0.5, 0.25, 0.0]
    safe_max = max(max_value, 1.0)

    Enum.map(steps, fn step ->
      y = dims.top + (plot_height(dims) - step * plot_height(dims))
      %{value: Float.round(safe_max * step, 1), y: Float.round(y, 2)}
    end)
  end

  defp chart_x_axis_ticks([], _dims), do: []

  defp chart_x_axis_ticks(series, dims) do
    ticks_count = dims.ticks
    max_index = max(length(series) - 1, 1)

    Enum.map(0..(ticks_count - 1), fn idx ->
      ratio = idx / max(ticks_count - 1, 1)
      series_index = round(max_index * ratio)
      point = Enum.at(series, series_index)
      x = Float.round(dims.left + ratio * plot_width(dims), 2)

      %{x: x, anchor: chart_tick_anchor(idx, ticks_count), label: format_short_time(point.bucket)}
    end)
  end

  defp chart_tick_anchor(0, _ticks_count), do: "start"
  defp chart_tick_anchor(idx, ticks_count) when idx == ticks_count - 1, do: "end"
  defp chart_tick_anchor(_idx, _ticks_count), do: "middle"

  defp plot_width(dims), do: dims.width - dims.left - dims.right
  defp plot_height(dims), do: dims.height - dims.top - dims.bottom
  defp plot_end_x(dims), do: dims.width - dims.right
  defp plot_end_y(dims), do: dims.height - dims.bottom

  defp schedule_refresh(socket) do
    if socket.assigns[:refresh_timer_ref] do
      Process.cancel_timer(socket.assigns.refresh_timer_ref)
    end

    interval_sec = @refresh_intervals[socket.assigns.refresh_interval]
    timer_ref = Process.send_after(self(), :refresh, interval_sec * 1_000)
    assign(socket, :refresh_timer_ref, timer_ref)
  end

  defp build_path(tab, window, interval, selected_langs) do
    params = %{"tab" => tab, "window" => window, "interval" => interval}

    params =
      if selected_langs == [] do
        params
      else
        Map.put(params, "langs", Enum.join(selected_langs, ","))
      end

    "/admin/code-checks?" <> URI.encode_query(params)
  end

  defp toggle_lang(selected_langs, lang) do
    if lang in selected_langs do
      Enum.reject(selected_langs, &(&1 == lang))
    else
      selected_langs ++ [lang]
    end
  end

  defp lang_checked?(selected_langs, lang), do: lang in selected_langs

  defp interval_button_class(interval_key, active_interval) do
    base = "btn btn-sm cb-rounded mr-2 mb-2"

    if interval_key == active_interval do
      "#{base} btn-secondary"
    else
      "#{base} btn-secondary cb-btn-secondary"
    end
  end

  defp window_button_class(window_key, active_window) do
    base = "btn btn-sm cb-rounded mr-2 mb-2"

    if window_key == active_window do
      "#{base} btn-secondary"
    else
      "#{base} btn-secondary cb-btn-secondary"
    end
  end

  defp window_button_label(window_key), do: String.upcase(window_key)
  defp active_tab?(tab, tab_key), do: tab == tab_key

  defp tab_button_class(tab_key, active_tab) do
    base = "btn btn-sm cb-rounded mr-2 mb-2"

    if tab_key == active_tab do
      "#{base} btn-secondary"
    else
      "#{base} btn-secondary cb-btn-secondary"
    end
  end

  defp format_number(nil), do: "0.0"
  defp format_number(value) when is_integer(value), do: Integer.to_string(value)
  defp format_number(value) when is_float(value), do: :erlang.float_to_binary(value, decimals: 1)

  defp format_short_time(%NaiveDateTime{} = datetime), do: Calendar.strftime(datetime, "%H:%M")
  defp format_short_time(%DateTime{} = datetime), do: Calendar.strftime(datetime, "%H:%M")
  defp format_datetime(%DateTime{} = datetime), do: Calendar.strftime(datetime, "%Y-%m-%d %H:%M:%S UTC")

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-fluid px-0">
      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <div>
            <h1 class="text-white mb-1">{@tabs[@tab]}</h1>
          </div>
          <div class="d-flex flex-wrap align-items-center justify-content-end">
            <span class="cb-text mr-2 mb-2">Tab:</span>
            <%= for tab_key <- @tab_order do %>
              <button
                type="button"
                phx-click="set_tab"
                phx-value-tab={tab_key}
                class={tab_button_class(tab_key, @tab)}
              >
                {@tabs[tab_key]}
              </button>
            <% end %>
            <span class="cb-text mr-2 mb-2">Window:</span>
            <%= for window_key <- @window_order do %>
              <button
                type="button"
                phx-click="set_window"
                phx-value-window={window_key}
                class={window_button_class(window_key, @window)}
              >
                {window_button_label(window_key)}
              </button>
            <% end %>
            <span class="cb-text ml-2 mr-2 mb-2">Refresh:</span>
            <%= for interval_key <- @refresh_order do %>
              <button
                type="button"
                phx-click="set_interval"
                phx-value-interval={interval_key}
                class={interval_button_class(interval_key, @refresh_interval)}
              >
                {interval_key}
              </button>
            <% end %>
          </div>
        </div>

        <%= if active_tab?(@tab, "live") do %>
          <div class="row">
            <div class="col-12 col-sm-6 col-xl-2 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-2 h-100">
                <div class="cb-text text-uppercase">Checks</div>
                <div class="text-white" style="font-size: 1.5rem; font-weight: 700; line-height: 1.1;">
                  {@stats.totals.checks_count}
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-6 col-xl-2 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-2 h-100">
                <div class="cb-text text-uppercase">Success</div>
                <div class="text-white" style="font-size: 1.5rem; font-weight: 700; line-height: 1.1;">
                  {@stats.totals.success_count}
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-6 col-xl-2 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-2 h-100">
                <div class="cb-text text-uppercase">Failure</div>
                <div class="text-white" style="font-size: 1.5rem; font-weight: 700; line-height: 1.1;">
                  {@stats.totals.failure_count}
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-6 col-xl-2 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-2 h-100">
                <div class="cb-text text-uppercase">Timeout</div>
                <div class="text-white" style="font-size: 1.5rem; font-weight: 700; line-height: 1.1;">
                  {@stats.totals.timeout_count}
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-6 col-xl-2 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-2 h-100">
                <div class="cb-text text-uppercase">Runs / Minute</div>
                <div class="text-white" style="font-size: 1.5rem; font-weight: 700; line-height: 1.1;">
                  {format_number(
                    @stats.totals.checks_count / max(div(@windows[@window].seconds, 60), 1)
                  )}
                </div>
              </div>
            </div>
            <div class="col-12 col-sm-6 col-xl-2 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-2 h-100">
                <div class="cb-text text-uppercase">Avg Duration</div>
                <div class="text-white" style="font-size: 1.5rem; font-weight: 700; line-height: 1.1;">
                  {format_number(@stats.totals.avg_duration_ms)}
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-12 col-xl-4 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h3 class="text-white mb-0">Languages</h3>
                  <button
                    type="button"
                    phx-click="reset_langs"
                    class="btn btn-sm btn-secondary cb-btn-secondary cb-rounded"
                  >
                    Top 3
                  </button>
                </div>
                <div class="table-responsive">
                  <table class="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th class="cb-text">Use</th>
                        <th class="cb-text">Lang</th>
                        <th class="cb-text text-right">Checks</th>
                        <th class="cb-text text-right">Success</th>
                        <th class="cb-text text-right">Failure</th>
                        <th class="cb-text text-right">Timeout</th>
                      </tr>
                    </thead>
                    <tbody>
                      <%= for row <- @stats.lang_rows do %>
                        <tr>
                          <td>
                            <input
                              type="checkbox"
                              checked={lang_checked?(@selected_langs, row.lang)}
                              phx-click="toggle_lang"
                              phx-value-lang={row.lang}
                            />
                          </td>
                          <td class="text-white">{row.lang}</td>
                          <td class="text-white text-right">{row.checks_count}</td>
                          <td class="text-white text-right">{row.success_count}</td>
                          <td class="text-white text-right">{row.failure_count}</td>
                          <td class="text-white text-right">{row.timeout_count}</td>
                        </tr>
                      <% end %>
                      <%= if Enum.empty?(@stats.lang_rows) do %>
                        <tr>
                          <td colspan="6" class="cb-text">No runs in selected window.</td>
                        </tr>
                      <% end %>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="col-12 col-xl-8 mb-3">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
                <p class="cb-text mb-2">Aggregated timeline for selected languages.</p>
                <% dims = @stats.main_chart.dims %>
                <svg
                  viewBox={"0 0 #{dims.width} #{dims.height}"}
                  width="100%"
                  height={dims.height}
                  role="img"
                  aria-label="Average duration timeline"
                >
                  <rect
                    x="0"
                    y="0"
                    width={dims.width}
                    height={dims.height}
                    rx="8"
                    ry="8"
                    fill="#15151c"
                  >
                  </rect>
                  <%= for line <- @stats.main_chart.y_lines do %>
                    <line
                      x1={dims.left}
                      y1={line.y}
                      x2={plot_end_x(dims)}
                      y2={line.y}
                      stroke="#8a919c"
                      stroke-width="1"
                    >
                    </line>
                    <text
                      x={dims.left - 6}
                      y={line.y + 4}
                      fill="#a4aab3"
                      font-size="11"
                      text-anchor="end"
                    >
                      {line.value}
                    </text>
                  <% end %>
                  <path
                    d={@stats.main_chart.path}
                    fill="none"
                    stroke="#e0bf7a"
                    stroke-width="3"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  >
                  </path>
                  <line
                    x1={dims.left}
                    y1={plot_end_y(dims)}
                    x2={plot_end_x(dims)}
                    y2={plot_end_y(dims)}
                    stroke="#a4aab3"
                    stroke-width="1"
                  >
                  </line>
                  <%= for tick <- @stats.main_chart.x_ticks do %>
                    <line
                      x1={tick.x}
                      y1={plot_end_y(dims)}
                      x2={tick.x}
                      y2={plot_end_y(dims) + 4}
                      stroke="#a4aab3"
                      stroke-width="1"
                    >
                    </line>
                    <text
                      x={tick.x}
                      y={dims.height - 6}
                      fill="#a4aab3"
                      font-size="11"
                      text-anchor={tick.anchor}
                    >
                      {tick.label}
                    </text>
                  <% end %>
                </svg>
              </div>
            </div>
          </div>

          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mb-3">
            <h3 class="text-white mb-3">Per-language Timeline (real duration)</h3>
            <div class="row">
              <%= for lang_chart <- @stats.lang_charts do %>
                <div class="col-12 col-xl-4 mb-3">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-2 h-100">
                    <div
                      class="cb-text mb-2 text-truncate"
                      style="font-size: 0.9rem; line-height: 1.35;"
                    >
                      <span class="text-white" style="font-size: 1.05rem; font-weight: 700;">
                        {lang_chart.lang}
                      </span>
                      <span class="ml-2">{lang_chart.total_checks} checks</span>
                      <span class="ml-2 text-white">p95:</span> {lang_chart.percentiles.p95}
                      <span class="ml-2 text-white">p75:</span> {lang_chart.percentiles.p75}
                      <span class="ml-2 text-white">p50:</span> {lang_chart.percentiles.p50}
                    </div>
                    <% dims = lang_chart.chart.dims %>
                    <svg
                      viewBox={"0 0 #{dims.width} #{dims.height}"}
                      width="100%"
                      height={dims.height}
                    >
                      <rect
                        x="0"
                        y="0"
                        width={dims.width}
                        height={dims.height}
                        rx="8"
                        ry="8"
                        fill="#15151c"
                      >
                      </rect>
                      <%= for line <- lang_chart.chart.y_lines do %>
                        <line
                          x1={dims.left}
                          y1={line.y}
                          x2={plot_end_x(dims)}
                          y2={line.y}
                          stroke="#59606f"
                          stroke-width="1"
                        >
                        </line>
                        <text
                          x={dims.left - 4}
                          y={line.y + 3}
                          fill="#98a1b2"
                          font-size="9"
                          text-anchor="end"
                        >
                          {line.value}ms
                        </text>
                      <% end %>
                      <path
                        d={lang_chart.chart.duration_path}
                        fill="none"
                        stroke="#e0bf7a"
                        stroke-width="3"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                      >
                      </path>
                      <line
                        x1={dims.left}
                        y1={plot_end_y(dims)}
                        x2={plot_end_x(dims)}
                        y2={plot_end_y(dims)}
                        stroke="#8992a4"
                        stroke-width="1"
                      >
                      </line>
                      <%= for tick <- lang_chart.chart.x_ticks do %>
                        <text
                          x={tick.x}
                          y={dims.height - 4}
                          fill="#a4aab3"
                          font-size="10"
                          text-anchor={tick.anchor}
                        >
                          {tick.label}
                        </text>
                      <% end %>
                    </svg>
                  </div>
                </div>
              <% end %>
              <%= if Enum.empty?(@stats.lang_charts) do %>
                <div class="col-12 cb-text">No language charts for selected filters.</div>
              <% end %>
            </div>
          </div>
        <% else %>
          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mb-3">
            <h3 class="text-white mb-2">Code Check Run Failures</h3>
            <p class="cb-text mb-3">
              Real failed runs and timeouts with captured error description. Last 100 records in selected window.
            </p>
            <div class="table-responsive">
              <table class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th class="cb-text">Started At</th>
                    <th class="cb-text">Lang</th>
                    <th class="cb-text">Result</th>
                    <th class="cb-text">Game</th>
                    <th class="cb-text">User</th>
                    <th class="cb-text">Duration ms</th>
                    <th class="cb-text">Error Description</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for run <- @failure_runs do %>
                    <tr>
                      <td class="text-white text-nowrap">{format_datetime(run.started_at)}</td>
                      <td class="text-white text-nowrap">{run.lang}</td>
                      <td class="text-white text-nowrap">{run.result}</td>
                      <td class="text-white text-nowrap">{run.game_id || "-"}</td>
                      <td class="text-white text-nowrap">{run.user_id || "-"}</td>
                      <td class="text-white text-nowrap">{run.duration_ms}</td>
                      <td class="text-white" style="white-space: pre-wrap; min-width: 26rem;">
                        {run.error_description}
                      </td>
                    </tr>
                  <% end %>
                  <%= if Enum.empty?(@failure_runs) do %>
                    <tr>
                      <td colspan="7" class="cb-text">
                        No failed or timeout runs with errors in selected window.
                      </td>
                    </tr>
                  <% end %>
                </tbody>
              </table>
            </div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end
end
