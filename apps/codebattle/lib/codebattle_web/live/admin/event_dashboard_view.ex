defmodule CodebattleWeb.Live.Admin.EventDashboardView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.Game
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserEvent
  alias Codebattle.UserEvent.Stage, as: UserEventStage
  alias Codebattle.UserGame
  alias Codebattle.UserGroupTournamentRun

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

  defp load_data(socket) do
    event = socket.assigns.event
    from = socket.assigns.from
    to = socket.assigns.to

    assign(socket,
      summary: load_summary(event.id),
      stages_stats: load_stages_stats(event.id, from, to),
      tournaments: load_tournaments(event.id),
      tournament_user_wins: load_tournament_user_wins(event.id, from, to),
      group_tournaments: load_group_tournaments(event.id),
      group_tournament_players: load_group_tournament_players(event.id),
      group_tournament_runs: load_group_tournament_runs(event.id, from, to),
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

  defp load_tournaments(event_id) do
    Repo.all(
      from(t in Tournament,
        where: t.event_id == ^event_id,
        order_by: [desc: t.inserted_at],
        select: %{
          id: t.id,
          name: t.name,
          state: t.state,
          starts_at: t.starts_at,
          started_at: t.started_at,
          finished_at: t.finished_at
        }
      )
    )
  end

  defp load_tournament_user_wins(event_id, from, to) do
    tournament_ids = Repo.all(from(t in Tournament, where: t.event_id == ^event_id, select: t.id))

    if tournament_ids == [] do
      %{}
    else
      from(ug in UserGame,
        join: g in Game,
        on: g.id == ug.game_id,
        where: g.tournament_id in ^tournament_ids,
        where: ug.inserted_at >= ^from and ug.inserted_at <= ^to,
        group_by: [g.tournament_id, ug.user_id],
        select: %{
          tournament_id: g.tournament_id,
          user_id: ug.user_id,
          games: count(ug.id),
          wins: sum(fragment("CASE WHEN ? = 'won' THEN 1 ELSE 0 END", ug.result)),
          langs: fragment("array_agg(DISTINCT ?)", ug.lang)
        }
      )
      |> Repo.all()
      |> Enum.group_by(& &1.tournament_id)
    end
  end

  defp load_group_tournaments(event_id) do
    Repo.all(
      from(gt in GroupTournament,
        where: gt.event_id == ^event_id,
        order_by: [desc: gt.inserted_at],
        select: %{
          id: gt.id,
          name: gt.name,
          slug: gt.slug,
          state: gt.state,
          starts_at: gt.starts_at,
          started_at: gt.started_at,
          finished_at: gt.finished_at,
          max_score: gt.max_score
        }
      )
    )
  end

  defp load_group_tournament_players(event_id) do
    from(gtp in GroupTournamentPlayer,
      join: gt in GroupTournament,
      on: gt.id == gtp.group_tournament_id,
      where: gt.event_id == ^event_id,
      select: %{
        group_tournament_id: gtp.group_tournament_id,
        user_id: gtp.user_id,
        lang: gtp.lang,
        state: gtp.state,
        place: gtp.place
      }
    )
    |> Repo.all()
    |> Enum.group_by(& &1.group_tournament_id)
  end

  defp load_group_tournament_runs(event_id, from, to) do
    from(r in UserGroupTournamentRun,
      join: gt in GroupTournament,
      on: gt.id == r.group_tournament_id,
      where: gt.event_id == ^event_id,
      where: r.inserted_at >= ^from and r.inserted_at <= ^to,
      group_by: r.group_tournament_id,
      select: %{
        group_tournament_id: r.group_tournament_id,
        total_runs: count(r.id),
        success_runs: sum(fragment("CASE WHEN ? = 'success' THEN 1 ELSE 0 END", r.status)),
        avg_score: avg(r.score)
      }
    )
    |> Repo.all()
    |> Map.new(&{&1.group_tournament_id, &1})
  end

  defp load_users_rows(event_id, from, to) do
    Repo.all(
      from(ue in UserEvent,
        left_join: ues in UserEventStage,
        on: ues.user_event_id == ue.id,
        where: ue.event_id == ^event_id,
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

  defp duration_between(%DateTime{} = a, %DateTime{} = b), do: DateTime.diff(b, a, :second)
  defp duration_between(_, _), do: nil

  defp avg_int(nil), do: "–"
  defp avg_int(value) when is_struct(value, Decimal), do: value |> Decimal.round(0) |> Decimal.to_string()
  defp avg_int(value) when is_number(value), do: value |> round() |> Integer.to_string()
  defp avg_int(_), do: "–"

  defp int(nil), do: 0
  defp int(value) when is_integer(value), do: value
  defp int(value) when is_struct(value, Decimal), do: Decimal.to_integer(Decimal.round(value, 0))
  defp int(value) when is_number(value), do: trunc(value)
  defp int(_), do: 0

  defp tournament_state_badge("finished"), do: "badge bg-success"
  defp tournament_state_badge("active"), do: "badge bg-primary"
  defp tournament_state_badge("waiting_participants"), do: "badge bg-info text-dark"
  defp tournament_state_badge("canceled"), do: "badge bg-danger"
  defp tournament_state_badge(_), do: "badge bg-secondary"

  defp event_stage_for_slug(%Event{stages: stages}, slug) do
    Enum.find(stages, fn s -> Map.get(s, :slug) == slug end)
  end

  defp langs_list(langs) when is_list(langs), do: langs |> Enum.reject(&is_nil/1) |> Enum.join(", ")
  defp langs_list(_), do: ""

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
        Tournaments <span class="badge bg-secondary ms-2">{length(@tournaments)}</span>
      </h2>
      <%= if @tournaments == [] do %>
        <p class="cb-text">No tournaments for this event.</p>
      <% else %>
        <%= for t <- @tournaments do %>
          <% rows = Map.get(@tournament_user_wins, t.id, []) %>
          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <a href={"/tournaments/#{t.id}"} class="text-info fw-bold">#{t.id} {t.name}</a>
                <span class={tournament_state_badge(t.state) <> " ms-2"}>{t.state}</span>
              </div>
              <div class="cb-text small">
                started: {format_dt(t.started_at)} · finished: {format_dt(t.finished_at)}
              </div>
            </div>
            <%= if rows == [] do %>
              <p class="cb-text small mb-0">No user_games in range.</p>
            <% else %>
              <table class="table table-sm table-dark table-bordered align-middle mb-0">
                <thead>
                  <tr class="cb-text small">
                    <th>User</th>
                    <th class="text-end">Games</th>
                    <th class="text-end">Wins</th>
                    <th>Langs</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for row <- Enum.sort_by(rows, & -int(&1.wins)) do %>
                    <tr>
                      <td>
                        <a href={"/admin/users/#{row.user_id}"} class="text-info">
                          {display_user(@user_names, row.user_id)}
                        </a>
                      </td>
                      <td class="text-white text-end">{int(row.games)}</td>
                      <td class="text-white text-end">{int(row.wins)}</td>
                      <td class="text-white small">{langs_list(row.langs)}</td>
                    </tr>
                  <% end %>
                </tbody>
              </table>
            <% end %>
          </div>
        <% end %>
      <% end %>

      <h2 class="text-white h4 mt-4 mb-3">
        <i class="bi bi-people"></i>
        Group Tournaments <span class="badge bg-secondary ms-2">{length(@group_tournaments)}</span>
      </h2>
      <%= if @group_tournaments == [] do %>
        <p class="cb-text">No group tournaments for this event.</p>
      <% else %>
        <%= for gt <- @group_tournaments do %>
          <% players = Map.get(@group_tournament_players, gt.id, []) %>
          <% runs = Map.get(@group_tournament_runs, gt.id) %>
          <% duration = duration_between(gt.started_at, gt.finished_at) %>
          <% lang_summary =
            players |> Enum.map(& &1.lang) |> Enum.reject(&is_nil/1) |> Enum.frequencies() %>
          <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <a href={"/admin/group_tournaments/#{gt.id}"} class="text-info fw-bold">
                  #{gt.id} {gt.name}
                </a>
                <span class={tournament_state_badge(gt.state) <> " ms-2"}>{gt.state}</span>
              </div>
              <div class="cb-text small">
                started: {format_dt(gt.started_at)} · finished: {format_dt(gt.finished_at)}
              </div>
            </div>
            <div class="row g-2 small mb-2">
              <div class="col-md-3">
                <span class="cb-text">duration:</span>
                <span class="text-white">{format_duration(duration)}</span>
              </div>
              <div class="col-md-3">
                <span class="cb-text">max_score:</span>
                <span class="text-white">{gt.max_score || "–"}</span>
              </div>
              <div class="col-md-3">
                <span class="cb-text">runs (range):</span>
                <span class="text-white">
                  {(runs && int(runs.total_runs)) || 0}
                  <span class="cb-text">(ok: {(runs && int(runs.success_runs)) || 0})</span>
                </span>
              </div>
              <div class="col-md-3">
                <span class="cb-text">avg run score:</span>
                <span class="text-white">{(runs && avg_int(runs.avg_score)) || "–"}</span>
              </div>
            </div>
            <%= if lang_summary != %{} do %>
              <div class="small mb-2">
                <span class="cb-text">langs:</span>
                <%= for {lang, n} <- Enum.sort_by(lang_summary, fn {_, n} -> -n end) do %>
                  <span class="badge bg-secondary ms-1">{lang} × {n}</span>
                <% end %>
              </div>
            <% end %>
            <%= if players == [] do %>
              <p class="cb-text small mb-0">No players.</p>
            <% else %>
              <table class="table table-sm table-dark table-bordered align-middle mb-0">
                <thead>
                  <tr class="cb-text small">
                    <th>User</th>
                    <th>Lang</th>
                    <th>State</th>
                    <th class="text-end">Place</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for p <- Enum.sort_by(players, &(&1.place || 9_999)) do %>
                    <tr>
                      <td>
                        <a href={"/admin/users/#{p.user_id}"} class="text-info">
                          {display_user(@user_names, p.user_id)}
                        </a>
                      </td>
                      <td class="text-white small">{p.lang || "–"}</td>
                      <td class="text-white small">{p.state}</td>
                      <td class="text-white text-end">{p.place || "–"}</td>
                    </tr>
                  <% end %>
                </tbody>
              </table>
            <% end %>
          </div>
        <% end %>
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
              <tr class="cb-text small">
                <th>User</th>
                <th>Status</th>
                <th>Current Stage</th>
                <th class="text-end">Tournaments ✓</th>
                <th class="text-end">Group T. ✓</th>
                <th class="text-end">Score</th>
                <th class="text-end">GT Score</th>
                <th class="text-end">Wins / Games</th>
                <th>Total Time</th>
                <th>Started</th>
                <th>Finished</th>
              </tr>
            </thead>
            <tbody>
              <%= for row <- @users_rows do %>
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
