defmodule CodebattleWeb.Live.Admin.EventDashboardView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.GroupTournament
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserEvent
  alias Codebattle.UserEvent.Stage, as: UserEventStage

  @presets [
    {"15m", 15 * 60},
    {"30m", 30 * 60},
    {"1h", 60 * 60},
    {"4h", 4 * 60 * 60},
    {"1d", 24 * 60 * 60},
    {"2d", 2 * 24 * 60 * 60}
  ]

  @default_preset "1h"

  @impl true
  def mount(%{"id" => event_id}, _session, socket) do
    event = Repo.get!(Event, event_id)
    {from, to} = preset_range(@default_preset)

    {:ok,
     socket
     |> assign(
       event: event,
       presets: @presets,
       preset: @default_preset,
       from: from,
       to: to,
       custom_from_input: format_input(from),
       custom_to_input: format_input(to),
       sort_tournaments: {:tournament_id, :desc},
       sort_group_tournaments: {:group_tournament_id, :desc},
       sort_users: {:total_score, :desc},
       layout: {CodebattleWeb.LayoutView, :admin}
     )
     |> load_data()}
  end

  @impl true
  def handle_event("preset", %{"preset" => preset}, socket) do
    case List.keyfind(@presets, preset, 0) do
      {^preset, _} ->
        {from, to} = preset_range(preset)

        {:noreply,
         socket
         |> assign(
           preset: preset,
           from: from,
           to: to,
           custom_from_input: format_input(from),
           custom_to_input: format_input(to)
         )
         |> load_data()}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("custom_range", %{"from" => from_str, "to" => to_str}, socket) do
    with {:ok, from} <- parse_input(from_str),
         {:ok, to} <- parse_input(to_str),
         true <- DateTime.compare(from, to) in [:lt, :eq] do
      {:noreply,
       socket
       |> assign(
         preset: "custom",
         from: from,
         to: to,
         custom_from_input: from_str,
         custom_to_input: to_str
       )
       |> load_data()}
    else
      _ ->
        {:noreply, put_flash(socket, :error, "Invalid date range")}
    end
  end

  def handle_event("reload", _params, socket) do
    {:noreply, load_data(socket)}
  end

  def handle_event("sort_table", %{"table" => table, "column" => column}, socket) do
    key = sort_assign_key(table)
    col = String.to_existing_atom(column)
    {cur_col, cur_dir} = Map.fetch!(socket.assigns, key)
    new_dir = if cur_col == col, do: flip_dir(cur_dir), else: :desc
    {:noreply, assign(socket, key, {col, new_dir})}
  end

  defp sort_assign_key("tournaments"), do: :sort_tournaments
  defp sort_assign_key("group_tournaments"), do: :sort_group_tournaments
  defp sort_assign_key("users"), do: :sort_users

  defp flip_dir(:asc), do: :desc
  defp flip_dir(:desc), do: :asc

  defp apply_sort(rows, {col, dir}) do
    {nils, rest} = Enum.split_with(rows, fn row -> is_nil(Map.get(row, col)) end)
    sorted = Enum.sort_by(rest, &sort_key(Map.get(&1, col)))
    sorted = if dir == :desc, do: Enum.reverse(sorted), else: sorted
    sorted ++ nils
  end

  defp sort_key(%Decimal{} = d), do: Decimal.to_float(d)
  defp sort_key(v), do: v

  defp sort_indicator({col, :asc}, col), do: " ▲"
  defp sort_indicator({col, :desc}, col), do: " ▼"
  defp sort_indicator(_, _), do: ""

  defp load_data(socket) do
    event = socket.assigns.event
    from = socket.assigns.from
    to = socket.assigns.to

    assign(socket,
      summary: load_summary(event.id),
      slug_summary: load_slug_summary(event),
      stages_stats: load_stages_stats(event.id, from, to),
      tournament_rows: load_tournament_rows(event.id, from, to),
      group_tournament_rows: load_group_tournament_rows(event.id, from, to),
      users_rows: load_users_rows(event.id, from, to),
      user_names: load_user_names_for_event(event.id)
    )
  end

  defp load_summary(event_id) do
    tournament_counts =
      from(t in Tournament,
        where: t.event_id == ^event_id,
        group_by: t.state,
        select: {t.state, count(t.id)}
      )
      |> Repo.all()
      |> Map.new()

    group_tournament_counts =
      from(gt in GroupTournament,
        where: gt.event_id == ^event_id,
        group_by: gt.state,
        select: {gt.state, count(gt.id)}
      )
      |> Repo.all()
      |> Map.new()

    %{
      live_tournaments: Map.get(tournament_counts, "active", 0),
      active_group_tournaments: Map.get(group_tournament_counts, "active", 0),
      finished_tournaments: Map.get(tournament_counts, "finished", 0),
      finished_group_tournaments: Map.get(group_tournament_counts, "finished", 0)
    }
  end

  defp load_slug_summary(%Event{id: event_id, stages: stages}) do
    user_counts =
      from(ues in UserEventStage,
        join: ue in UserEvent,
        on: ue.id == ues.user_event_id,
        where: ue.event_id == ^event_id,
        group_by: ues.slug,
        select: {ues.slug, count(ues.id)}
      )
      |> Repo.all()
      |> Map.new()

    Enum.map(stages || [], fn stage ->
      %{
        slug: stage.slug,
        name: Map.get(stage, :name),
        status: Map.get(stage, :status),
        tournament_id: Map.get(stage, :tournament_id),
        group_tournament_id: Map.get(stage, :group_tournament_id),
        user_count: Map.get(user_counts, stage.slug, 0)
      }
    end)
  end

  defp preset_range(preset) do
    now = DateTime.truncate(DateTime.utc_now(), :second)

    case List.keyfind(@presets, preset, 0) do
      {^preset, seconds} -> {DateTime.add(now, -seconds, :second), now}
      _ -> {DateTime.add(now, -3600, :second), now}
    end
  end

  defp parse_input(""), do: :error

  defp parse_input(str) do
    str = if String.length(str) == 16, do: str <> ":00", else: str

    case DateTime.from_iso8601(str <> "Z") do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :second)}
      _ -> :error
    end
  end

  defp format_input(%DateTime{} = dt) do
    Calendar.strftime(dt, "%Y-%m-%dT%H:%M")
  end

  defp load_stages_stats(event_id, from, to) do
    Repo.all(
      from(ues in UserEventStage,
        join: ue in UserEvent,
        on: ue.id == ues.user_event_id,
        where: ue.event_id == ^event_id,
        where: ues.updated_at >= ^from and ues.updated_at <= ^to,
        group_by: ues.slug,
        order_by: ues.slug,
        select: %{
          slug: ues.slug,
          total: count(ues.id),
          completed: sum(fragment("CASE WHEN ?::text = 'completed' THEN 1 ELSE 0 END", ues.status)),
          passed: sum(fragment("CASE WHEN ?::text = 'passed' THEN 1 ELSE 0 END", ues.status)),
          failed: sum(fragment("CASE WHEN ?::text = 'failed' THEN 1 ELSE 0 END", ues.status)),
          started: sum(fragment("CASE WHEN ?::text = 'started' THEN 1 ELSE 0 END", ues.status)),
          tournament_finished: sum(fragment("CASE WHEN ? THEN 1 ELSE 0 END", ues.tournament_finished)),
          group_tournament_finished: sum(fragment("CASE WHEN ? THEN 1 ELSE 0 END", ues.group_tournament_finished)),
          avg_score: avg(ues.score),
          avg_time: avg(ues.time_spent_in_seconds),
          avg_wins: avg(ues.wins_count),
          avg_games: avg(ues.games_count),
          avg_gt_score: avg(ues.group_tournament_score),
          avg_gt_time: avg(ues.group_tournament_time_spent_in_seconds)
        }
      )
    )
  end

  defp load_tournament_rows(event_id, from, to) do
    Repo.all(
      from(ues in UserEventStage,
        join: ue in UserEvent,
        on: ue.id == ues.user_event_id,
        where: ue.event_id == ^event_id,
        where: not is_nil(ues.tournament_id),
        where: ues.updated_at >= ^from and ues.updated_at <= ^to,
        order_by: [desc: ues.tournament_id, desc: ues.wins_count, desc: ues.score],
        select: %{
          tournament_id: ues.tournament_id,
          user_id: ue.user_id,
          slug: ues.slug,
          status: ues.status,
          wins_count: ues.wins_count,
          games_count: ues.games_count,
          score: ues.score,
          time_spent_in_seconds: ues.time_spent_in_seconds,
          place_in_total_rank: ues.place_in_total_rank,
          place_in_category_rank: ues.place_in_category_rank,
          tournament_finished: ues.tournament_finished,
          started_at: ues.started_at,
          finished_at: ues.finished_at
        }
      )
    )
  end

  defp load_group_tournament_rows(event_id, from, to) do
    Repo.all(
      from(ues in UserEventStage,
        join: ue in UserEvent,
        on: ue.id == ues.user_event_id,
        where: ue.event_id == ^event_id,
        where: not is_nil(ues.group_tournament_id),
        where: ues.updated_at >= ^from and ues.updated_at <= ^to,
        order_by: [desc: ues.group_tournament_id, desc: ues.group_tournament_score],
        select: %{
          group_tournament_id: ues.group_tournament_id,
          user_id: ue.user_id,
          slug: ues.slug,
          status: ues.status,
          group_tournament_score: ues.group_tournament_score,
          group_tournament_total_score: ues.group_tournament_total_score,
          group_tournament_time_spent_in_seconds: ues.group_tournament_time_spent_in_seconds,
          place_in_total_rank: ues.place_in_total_rank,
          place_in_category_rank: ues.place_in_category_rank,
          group_tournament_finished: ues.group_tournament_finished,
          started_at: ues.started_at,
          finished_at: ues.finished_at
        }
      )
    )
  end

  defp load_users_rows(event_id, from, to) do
    Repo.all(
      from(ue in UserEvent,
        left_join: ues in UserEventStage,
        on: ues.user_event_id == ue.id,
        where: ue.event_id == ^event_id,
        where: ue.status != "pending",
        where: ues.updated_at >= ^from and ues.updated_at <= ^to,
        group_by: [ue.id, ue.user_id, ue.status, ue.current_stage_slug, ue.started_at, ue.finished_at],
        order_by: [desc: ue.updated_at],
        select: %{
          user_event_id: ue.id,
          user_id: ue.user_id,
          status: ue.status,
          current_stage_slug: ue.current_stage_slug,
          started_at: ue.started_at,
          finished_at: ue.finished_at,
          stages_count: count(ues.id),
          tournaments_completed: sum(fragment("CASE WHEN ? THEN 1 ELSE 0 END", ues.tournament_finished)),
          group_tournaments_completed: sum(fragment("CASE WHEN ? THEN 1 ELSE 0 END", ues.group_tournament_finished)),
          total_score: sum(ues.score),
          total_gt_score: sum(ues.group_tournament_score),
          total_wins: sum(ues.wins_count),
          total_games: sum(ues.games_count),
          total_time: sum(ues.time_spent_in_seconds)
        }
      )
    )
  end

  defp load_user_names_for_event(event_id) do
    from(u in User,
      join: ue in UserEvent,
      on: ue.user_id == u.id,
      where: ue.event_id == ^event_id,
      select: {u.id, u.name}
    )
    |> Repo.all()
    |> Map.new()
  end

  defp display_user(user_names, user_id) do
    case Map.get(user_names, user_id) do
      nil -> "##{user_id}"
      "" -> "##{user_id}"
      name -> "##{user_id} #{name}"
    end
  end

  defp format_dt(nil), do: "–"

  defp format_dt(%NaiveDateTime{} = dt) do
    dt |> DateTime.from_naive!("UTC") |> format_dt()
  end

  defp format_dt(%DateTime{} = dt), do: Calendar.strftime(dt, "%Y-%m-%d %H:%M")

  defp format_duration(nil), do: "–"

  defp format_duration(seconds) when is_number(seconds) do
    s = trunc(seconds)
    h = div(s, 3600)
    m = div(rem(s, 3600), 60)
    sec = rem(s, 60)

    cond do
      h > 0 -> "#{h}h #{m}m"
      m > 0 -> "#{m}m #{sec}s"
      true -> "#{sec}s"
    end
  end

  defp avg_int(nil), do: "–"
  defp avg_int(value) when is_struct(value, Decimal), do: value |> Decimal.round(0) |> Decimal.to_string()
  defp avg_int(value) when is_number(value), do: value |> round() |> Integer.to_string()
  defp avg_int(_), do: "–"

  defp int(nil), do: 0
  defp int(value) when is_integer(value), do: value
  defp int(value) when is_struct(value, Decimal), do: Decimal.to_integer(Decimal.round(value, 0))
  defp int(value) when is_number(value), do: trunc(value)
  defp int(_), do: 0

  defp event_stage_for_slug(%Event{stages: stages}, slug) do
    Enum.find(stages, fn s -> Map.get(s, :slug) == slug end)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 class="text-white mb-1">
            <i class="bi bi-bar-chart"></i> Event Dashboard: {@event.title}
          </h1>
          <div class="cb-text small">
            slug: <code class="text-info">{@event.slug}</code>
            · id: <code class="text-info">{@event.id}</code>
            · starts_at: {format_dt(@event.starts_at)}
          </div>
        </div>
        <a href={"/admin/events/#{@event.id}"} class="btn btn-sm btn-outline-light cb-rounded">
          ← Back to event
        </a>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-3 col-6">
          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
            <div class="cb-text small text-uppercase">Live tournaments</div>
            <div class="text-white display-6">{@summary.live_tournaments}</div>
            <div class="cb-text small">state = active</div>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
            <div class="cb-text small text-uppercase">Active group tournaments</div>
            <div class="text-white display-6">{@summary.active_group_tournaments}</div>
            <div class="cb-text small">state = active</div>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
            <div class="cb-text small text-uppercase">Finished tournaments</div>
            <div class="text-white display-6">{@summary.finished_tournaments}</div>
            <div class="cb-text small">all time</div>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
            <div class="cb-text small text-uppercase">Finished group tournaments</div>
            <div class="text-white display-6">{@summary.finished_group_tournaments}</div>
            <div class="cb-text small">all time</div>
          </div>
        </div>
      </div>

      <%= if @slug_summary != [] do %>
        <div class="row g-3 mb-4">
          <%= for slug <- @slug_summary do %>
            <div class="col-md-4">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <code class="text-info">{slug.slug}</code>
                    <%= if slug.name do %>
                      <span class="cb-text small ms-1">({slug.name})</span>
                    <% end %>
                  </div>
                  <%= if slug.status do %>
                    <span class="badge bg-secondary">{slug.status}</span>
                  <% end %>
                </div>
                <div class="text-white display-6">{slug.user_count}</div>
                <div class="cb-text small mb-2">users with this stage</div>
                <div class="small">
                  <%= if slug.tournament_id do %>
                    <div>
                      <span class="cb-text">tournament:</span>
                      <a href={"/tournaments/#{slug.tournament_id}"} class="text-info">
                        #{slug.tournament_id}
                      </a>
                    </div>
                  <% end %>
                  <%= if slug.group_tournament_id do %>
                    <div>
                      <span class="cb-text">group_tournament:</span>
                      <a
                        href={"/admin/group_tournaments/#{slug.group_tournament_id}"}
                        class="text-info"
                      >
                        #{slug.group_tournament_id}
                      </a>
                    </div>
                  <% end %>
                </div>
              </div>
            </div>
          <% end %>
        </div>
      <% end %>

      <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mb-4">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="d-flex gap-1 align-items-center">
            <span class="cb-text small">Range:</span>
            <%= for {preset, _seconds} <- @presets do %>
              <button
                class={"btn btn-sm cb-rounded #{if @preset == preset, do: "btn-light", else: "btn-outline-light"}"}
                phx-click="preset"
                phx-value-preset={preset}
              >
                {preset}
              </button>
            <% end %>
          </div>

          <form phx-submit="custom_range" class="d-flex align-items-center gap-2 ms-auto">
            <span class="cb-text small">Custom:</span>
            <input
              type="datetime-local"
              name="from"
              value={@custom_from_input}
              class="form-control form-control-sm cb-bg-panel cb-border-color text-white"
              style="width: 200px;"
            />
            <span class="cb-text">→</span>
            <input
              type="datetime-local"
              name="to"
              value={@custom_to_input}
              class="form-control form-control-sm cb-bg-panel cb-border-color text-white"
              style="width: 200px;"
            />
            <button
              type="submit"
              class={"btn btn-sm cb-rounded #{if @preset == "custom", do: "btn-light", else: "btn-outline-light"}"}
            >
              Apply
            </button>
          </form>

          <button class="btn btn-sm btn-outline-info cb-rounded" phx-click="reload">
            <i class="bi bi-arrow-clockwise"></i> Reload
          </button>
        </div>
        <div class="cb-text small mt-2">
          Showing: {format_dt(@from)} → {format_dt(@to)} ({format_duration(
            DateTime.diff(@to, @from, :second)
          )})
        </div>
      </div>

      <h2 class="text-white h4 mt-4 mb-3">
        <i class="bi bi-collection"></i> Event Stages
      </h2>
      <%= if @stages_stats == [] do %>
        <p class="cb-text">No user_event_stages activity in range.</p>
      <% else %>
        <div class="row g-3 mb-4">
          <%= for stat <- @stages_stats do %>
            <div class="col-md-6 col-xl-4">
              <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h3 class="h5 text-white mb-0">
                    <code class="text-info">{stat.slug}</code>
                  </h3>
                  <span class="badge bg-secondary">{int(stat.total)} total</span>
                </div>
                <% stage = event_stage_for_slug(@event, stat.slug) %>
                <%= if stage do %>
                  <div class="cb-text small mb-2">
                    <%= if stage.tournament_id do %>
                      tournament:
                      <a href={"/tournaments/#{stage.tournament_id}"} class="text-info">
                        #{stage.tournament_id}
                      </a>
                    <% end %>
                    <%= if stage.group_tournament_id do %>
                      · group_tournament:
                      <a
                        href={"/admin/group_tournaments/#{stage.group_tournament_id}"}
                        class="text-info"
                      >
                        #{stage.group_tournament_id}
                      </a>
                    <% end %>
                  </div>
                <% end %>
                <table class="table table-sm table-dark mb-0 small">
                  <tbody>
                    <tr>
                      <td class="cb-text">completed</td>
                      <td class="text-white text-end">{int(stat.completed)}</td>
                      <td class="cb-text">passed</td>
                      <td class="text-white text-end">{int(stat.passed)}</td>
                    </tr>
                    <tr>
                      <td class="cb-text">started</td>
                      <td class="text-white text-end">{int(stat.started)}</td>
                      <td class="cb-text">failed</td>
                      <td class="text-white text-end">{int(stat.failed)}</td>
                    </tr>
                    <tr>
                      <td class="cb-text">tour. finished</td>
                      <td class="text-white text-end">{int(stat.tournament_finished)}</td>
                      <td class="cb-text">gt. finished</td>
                      <td class="text-white text-end">{int(stat.group_tournament_finished)}</td>
                    </tr>
                    <tr>
                      <td class="cb-text">avg score</td>
                      <td class="text-white text-end">{avg_int(stat.avg_score)}</td>
                      <td class="cb-text">avg gt score</td>
                      <td class="text-white text-end">{avg_int(stat.avg_gt_score)}</td>
                    </tr>
                    <tr>
                      <td class="cb-text">avg time</td>
                      <td class="text-white text-end">
                        {format_duration(stat.avg_time && Decimal.to_float(stat.avg_time))}
                      </td>
                      <td class="cb-text">avg gt time</td>
                      <td class="text-white text-end">
                        {format_duration(stat.avg_gt_time && Decimal.to_float(stat.avg_gt_time))}
                      </td>
                    </tr>
                    <tr>
                      <td class="cb-text">avg wins</td>
                      <td class="text-white text-end">{avg_int(stat.avg_wins)}</td>
                      <td class="cb-text">avg games</td>
                      <td class="text-white text-end">{avg_int(stat.avg_games)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          <% end %>
        </div>
      <% end %>

      <h2 class="text-white h4 mt-4 mb-3">
        <i class="bi bi-trophy"></i>
        Tournaments
        <span class="badge bg-secondary ms-2">
          {length(Enum.uniq_by(@tournament_rows, & &1.tournament_id))} tournaments · {length(
            @tournament_rows
          )} rows
        </span>
      </h2>
      <%= if @tournament_rows == [] do %>
        <p class="cb-text">No user_event_stages with tournament_id in range.</p>
      <% else %>
        <div class="table-responsive">
          <table class="table table-sm table-dark table-bordered align-middle">
            <thead>
              <tr class="cb-text small" style="cursor: pointer; user-select: none;">
                <th
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="tournament_id"
                >
                  Tournament{sort_indicator(@sort_tournaments, :tournament_id)}
                </th>
                <th>User</th>
                <th phx-click="sort_table" phx-value-table="tournaments" phx-value-column="slug">
                  Stage{sort_indicator(@sort_tournaments, :slug)}
                </th>
                <th phx-click="sort_table" phx-value-table="tournaments" phx-value-column="status">
                  Status{sort_indicator(@sort_tournaments, :status)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="wins_count"
                >
                  Wins{sort_indicator(@sort_tournaments, :wins_count)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="games_count"
                >
                  Games{sort_indicator(@sort_tournaments, :games_count)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="score"
                >
                  Score{sort_indicator(@sort_tournaments, :score)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="time_spent_in_seconds"
                >
                  Time{sort_indicator(@sort_tournaments, :time_spent_in_seconds)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="place_in_total_rank"
                >
                  Place{sort_indicator(@sort_tournaments, :place_in_total_rank)}
                </th>
                <th
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="tournament_finished"
                >
                  ✓{sort_indicator(@sort_tournaments, :tournament_finished)}
                </th>
                <th phx-click="sort_table" phx-value-table="tournaments" phx-value-column="started_at">
                  Started{sort_indicator(@sort_tournaments, :started_at)}
                </th>
                <th
                  phx-click="sort_table"
                  phx-value-table="tournaments"
                  phx-value-column="finished_at"
                >
                  Finished{sort_indicator(@sort_tournaments, :finished_at)}
                </th>
              </tr>
            </thead>
            <tbody>
              <%= for row <- apply_sort(@tournament_rows, @sort_tournaments) do %>
                <tr>
                  <td>
                    <a href={"/tournaments/#{row.tournament_id}"} class="text-info">
                      #{row.tournament_id}
                    </a>
                  </td>
                  <td>
                    <a href={"/admin/users/#{row.user_id}"} class="text-info">
                      {display_user(@user_names, row.user_id)}
                    </a>
                  </td>
                  <td class="text-white small"><code class="text-info">{row.slug}</code></td>
                  <td class="text-white small">{row.status}</td>
                  <td class="text-white text-end">{int(row.wins_count)}</td>
                  <td class="text-white text-end">{int(row.games_count)}</td>
                  <td class="text-white text-end">{int(row.score)}</td>
                  <td class="text-white text-end small">
                    {format_duration(int(row.time_spent_in_seconds))}
                  </td>
                  <td class="text-white text-end small">{row.place_in_total_rank || "–"}</td>
                  <td class="text-white small">
                    <%= if row.tournament_finished do %>
                      <span class="badge bg-success">yes</span>
                    <% else %>
                      <span class="badge bg-secondary">no</span>
                    <% end %>
                  </td>
                  <td class="text-white small">{format_dt(row.started_at)}</td>
                  <td class="text-white small">{format_dt(row.finished_at)}</td>
                </tr>
              <% end %>
            </tbody>
          </table>
        </div>
      <% end %>

      <h2 class="text-white h4 mt-4 mb-3">
        <i class="bi bi-people"></i>
        Group Tournaments
        <span class="badge bg-secondary ms-2">
          {length(Enum.uniq_by(@group_tournament_rows, & &1.group_tournament_id))} group tournaments · {length(
            @group_tournament_rows
          )} rows
        </span>
      </h2>
      <%= if @group_tournament_rows == [] do %>
        <p class="cb-text">No user_event_stages with group_tournament_id in range.</p>
      <% else %>
        <div class="table-responsive">
          <table class="table table-sm table-dark table-bordered align-middle">
            <thead>
              <tr class="cb-text small" style="cursor: pointer; user-select: none;">
                <th
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="group_tournament_id"
                >
                  Group Tournament{sort_indicator(@sort_group_tournaments, :group_tournament_id)}
                </th>
                <th>User</th>
                <th phx-click="sort_table" phx-value-table="group_tournaments" phx-value-column="slug">
                  Stage{sort_indicator(@sort_group_tournaments, :slug)}
                </th>
                <th
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="status"
                >
                  Status{sort_indicator(@sort_group_tournaments, :status)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="group_tournament_score"
                >
                  Score{sort_indicator(@sort_group_tournaments, :group_tournament_score)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="group_tournament_total_score"
                >
                  Total Score{sort_indicator(@sort_group_tournaments, :group_tournament_total_score)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="group_tournament_time_spent_in_seconds"
                >
                  Time{sort_indicator(
                    @sort_group_tournaments,
                    :group_tournament_time_spent_in_seconds
                  )}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="place_in_total_rank"
                >
                  Place{sort_indicator(@sort_group_tournaments, :place_in_total_rank)}
                </th>
                <th
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="group_tournament_finished"
                >
                  ✓{sort_indicator(@sort_group_tournaments, :group_tournament_finished)}
                </th>
                <th
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="started_at"
                >
                  Started{sort_indicator(@sort_group_tournaments, :started_at)}
                </th>
                <th
                  phx-click="sort_table"
                  phx-value-table="group_tournaments"
                  phx-value-column="finished_at"
                >
                  Finished{sort_indicator(@sort_group_tournaments, :finished_at)}
                </th>
              </tr>
            </thead>
            <tbody>
              <%= for row <- apply_sort(@group_tournament_rows, @sort_group_tournaments) do %>
                <tr>
                  <td>
                    <a
                      href={"/admin/group_tournaments/#{row.group_tournament_id}"}
                      class="text-info"
                    >
                      #{row.group_tournament_id}
                    </a>
                  </td>
                  <td>
                    <a href={"/admin/users/#{row.user_id}"} class="text-info">
                      {display_user(@user_names, row.user_id)}
                    </a>
                  </td>
                  <td class="text-white small"><code class="text-info">{row.slug}</code></td>
                  <td class="text-white small">{row.status}</td>
                  <td class="text-white text-end">{int(row.group_tournament_score)}</td>
                  <td class="text-white text-end">{int(row.group_tournament_total_score)}</td>
                  <td class="text-white text-end small">
                    {format_duration(int(row.group_tournament_time_spent_in_seconds))}
                  </td>
                  <td class="text-white text-end small">{row.place_in_total_rank || "–"}</td>
                  <td class="text-white small">
                    <%= if row.group_tournament_finished do %>
                      <span class="badge bg-success">yes</span>
                    <% else %>
                      <span class="badge bg-secondary">no</span>
                    <% end %>
                  </td>
                  <td class="text-white small">{format_dt(row.started_at)}</td>
                  <td class="text-white small">{format_dt(row.finished_at)}</td>
                </tr>
              <% end %>
            </tbody>
          </table>
        </div>
      <% end %>

      <h2 class="text-white h4 mt-4 mb-3">
        <i class="bi bi-person-lines-fill"></i>
        Users <span class="badge bg-secondary ms-2">{length(@users_rows)}</span>
      </h2>
      <%= if @users_rows == [] do %>
        <p class="cb-text">No user activity in range.</p>
      <% else %>
        <div class="table-responsive">
          <table class="table table-sm table-dark table-bordered align-middle">
            <thead>
              <tr class="cb-text small" style="cursor: pointer; user-select: none;">
                <th phx-click="sort_table" phx-value-table="users" phx-value-column="user_id">
                  User{sort_indicator(@sort_users, :user_id)}
                </th>
                <th phx-click="sort_table" phx-value-table="users" phx-value-column="status">
                  Status{sort_indicator(@sort_users, :status)}
                </th>
                <th
                  phx-click="sort_table"
                  phx-value-table="users"
                  phx-value-column="current_stage_slug"
                >
                  Current Stage{sort_indicator(@sort_users, :current_stage_slug)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="users"
                  phx-value-column="tournaments_completed"
                >
                  Tournaments ✓{sort_indicator(@sort_users, :tournaments_completed)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="users"
                  phx-value-column="group_tournaments_completed"
                >
                  Group T. ✓{sort_indicator(@sort_users, :group_tournaments_completed)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="users"
                  phx-value-column="total_score"
                >
                  Score{sort_indicator(@sort_users, :total_score)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="users"
                  phx-value-column="total_gt_score"
                >
                  GT Score{sort_indicator(@sort_users, :total_gt_score)}
                </th>
                <th
                  class="text-end"
                  phx-click="sort_table"
                  phx-value-table="users"
                  phx-value-column="total_wins"
                >
                  Wins / Games{sort_indicator(@sort_users, :total_wins)}
                </th>
                <th phx-click="sort_table" phx-value-table="users" phx-value-column="total_time">
                  Total Time{sort_indicator(@sort_users, :total_time)}
                </th>
                <th phx-click="sort_table" phx-value-table="users" phx-value-column="started_at">
                  Started{sort_indicator(@sort_users, :started_at)}
                </th>
                <th phx-click="sort_table" phx-value-table="users" phx-value-column="finished_at">
                  Finished{sort_indicator(@sort_users, :finished_at)}
                </th>
              </tr>
            </thead>
            <tbody>
              <%= for row <- apply_sort(@users_rows, @sort_users) do %>
                <tr>
                  <td>
                    <a href={"/admin/users/#{row.user_id}"} class="text-info">
                      {display_user(@user_names, row.user_id)}
                    </a>
                  </td>
                  <td class="text-white small">{row.status}</td>
                  <td class="text-white small">
                    <code class="text-info">{row.current_stage_slug || "–"}</code>
                  </td>
                  <td class="text-white text-end">{int(row.tournaments_completed)}</td>
                  <td class="text-white text-end">{int(row.group_tournaments_completed)}</td>
                  <td class="text-white text-end">{int(row.total_score)}</td>
                  <td class="text-white text-end">{int(row.total_gt_score)}</td>
                  <td class="text-white text-end small">
                    {int(row.total_wins)} / {int(row.total_games)}
                  </td>
                  <td class="text-white small">{format_duration(int(row.total_time))}</td>
                  <td class="text-white small">{format_dt(row.started_at)}</td>
                  <td class="text-white small">{format_dt(row.finished_at)}</td>
                </tr>
              <% end %>
            </tbody>
          </table>
        </div>
      <% end %>
    </div>
    """
  end
end
