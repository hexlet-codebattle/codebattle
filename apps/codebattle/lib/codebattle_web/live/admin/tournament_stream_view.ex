defmodule CodebattleWeb.Live.Admin.TournamentStreamView do
  @moduledoc false
  use CodebattleWeb, :live_view

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Simulator
  alias CodebattleWeb.TournamentAdminChannel

  require Logger

  @widgets [
    %{key: "leftEditor", label: "Left editor", params: "font_size=24&editor_theme=cb-stream"},
    %{key: "rightEditor", label: "Right editor", params: "font_size=24&editor_theme=cb-stream"},
    %{key: "timer", label: "Timer", params: ""},
    %{key: "task", label: "Task", params: "font_size=22"},
    %{key: "examples", label: "Examples", params: "font_size=20"},
    %{key: "leftTests", label: "Left tests", params: ""},
    %{key: "rightTests", label: "Right tests", params: ""}
  ]

  @impl true
  def mount(_params, session, socket) do
    tournament = session["tournament"]
    current_user = session["current_user"]

    if connected?(socket) do
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}:stream")
    end

    socket =
      socket
      |> assign(
        layout: {CodebattleWeb.LayoutView, :admin},
        tournament: tournament,
        current_user: current_user,
        active_game_id: TournamentAdminChannel.get_active_game(tournament.id),
        autoselect_delay_ms: TournamentAdminChannel.get_autoselect_delay(tournament.id),
        widgets: @widgets,
        filter: "current",
        now: NaiveDateTime.utc_now(:second),
        # Whether the per-second countdown tick loop is currently armed.
        ticking: false,
        # The simulator panel is always available on the admin stream page, so bots
        # can be started for any tournament — even one created without meta.simulator.
        simulator_enabled: true
      )
      |> assign_matches_and_players()
      |> assign_simulator_state()

    # Only arm the "round ends in" countdown once connected, and only while a
    # round is actually counting down (see ensure_ticking/1). A finished/waiting
    # tournament shows a static label, so it must not push a diff every second.
    socket = if connected?(socket), do: ensure_ticking(socket), else: socket

    {:ok, socket}
  end

  defp assign_simulator_state(socket) do
    sim =
      case Simulator.get_state(socket.assigns.tournament.id) do
        nil -> %{status: :idle, settings: Simulator.default_settings(), scheduled_count: 0}
        other -> other
      end

    assign(socket,
      simulator: sim,
      bots_globally_enabled: Simulator.bots_globally_enabled?()
    )
  end

  @impl true
  def handle_event("set_active", %{"game_id" => game_id_str}, socket) do
    tournament_id = socket.assigns.tournament.id

    case Integer.parse(game_id_str) do
      {game_id, ""} ->
        TournamentAdminChannel.store_active_game(tournament_id, game_id)

        Codebattle.PubSub.broadcast("tournament:stream:active_game", %{
          tournament_id: tournament_id,
          game_id: game_id
        })

        {:noreply, assign(socket, active_game_id: game_id)}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("clear_active", _, socket) do
    tournament_id = socket.assigns.tournament.id
    TournamentAdminChannel.store_active_game(tournament_id, nil)

    Codebattle.PubSub.broadcast("tournament:stream:active_game", %{
      tournament_id: tournament_id,
      game_id: nil
    })

    {:noreply, assign(socket, active_game_id: nil)}
  end

  def handle_event("save_autoselect_delay", %{"autoselect_delay_sec" => raw}, socket) do
    tournament_id = socket.assigns.tournament.id
    delay_ms = parse_delay_ms(raw)
    TournamentAdminChannel.store_autoselect_delay(tournament_id, delay_ms)
    {:noreply, assign(socket, autoselect_delay_ms: delay_ms)}
  end

  def handle_event("set_filter", %{"filter" => filter}, socket) when filter in ~w(current playing history) do
    {:noreply, assign(socket, filter: filter)}
  end

  def handle_event("set_filter", _, socket), do: {:noreply, socket}

  def handle_event("sim_" <> action, params, socket) do
    if socket.assigns.simulator_enabled do
      tid = socket.assigns.tournament.id

      case action do
        "start" -> Simulator.start(tid)
        "retry" -> Simulator.retry(tid)
        "pause" -> Simulator.pause(tid)
        "resume" -> Simulator.resume(tid)
        "stop" -> Simulator.stop(tid)
        "settings" -> Simulator.update_settings(tid, params)
        _ -> :ok
      end

      {:noreply, assign_simulator_state(socket)}
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_info(%{event: "tournament:stream:active_game", payload: payload}, socket) do
    {:noreply, assign(socket, active_game_id: payload[:game_id] || payload["game_id"])}
  end

  def handle_info(%{event: event}, socket)
      when event in [
             "tournament:match:upserted",
             "tournament:round_created",
             "tournament:round_finished",
             "tournament:updated",
             "tournament:finished"
           ] do
    {:noreply,
     socket
     |> assign_matches_and_players()
     |> assign_simulator_state()
     |> ensure_ticking()}
  end

  def handle_info(:tick, socket) do
    socket = assign(socket, now: NaiveDateTime.utc_now(:second))

    # Keep the loop alive only while there is a moving countdown to refresh.
    # Otherwise stop, so a finished/waiting tournament no longer pushes a diff
    # to the client every second; a new round re-arms it via ensure_ticking/1.
    socket =
      if countdown_active?(socket.assigns.tournament) do
        Process.send_after(self(), :tick, 1000)
        socket
      else
        assign(socket, ticking: false)
      end

    {:noreply, socket}
  end

  def handle_info(msg, socket) do
    Logger.debug("Stream admin LV unexpected: #{inspect(msg)}")
    {:noreply, socket}
  end

  # Arm the countdown tick loop if it isn't already running and the tournament is
  # in a state that needs a per-second countdown. Idempotent: safe to call from
  # mount and from any handler that may have changed the tournament state.
  defp ensure_ticking(socket) do
    if not socket.assigns.ticking and countdown_active?(socket.assigns.tournament) do
      Process.send_after(self(), :tick, 1000)
      assign(socket, ticking: true)
    else
      socket
    end
  end

  # Only an active round (including its break) has a moving "ends in / next round
  # in" countdown. Finished/waiting tournaments show a static label.
  defp countdown_active?(%{state: "active"}), do: true
  defp countdown_active?(_), do: false

  defp assign_matches_and_players(socket) do
    tournament =
      try do
        Tournament.Context.get!(socket.assigns.tournament.id)
      rescue
        _ -> socket.assigns.tournament
      end

    matches =
      tournament
      |> Helpers.get_matches()
      |> Enum.sort_by(&match_sort_key/1)

    players_by_id =
      tournament
      |> Helpers.get_players()
      |> Map.new(fn p -> {p.id, p} end)

    assign(socket,
      tournament: tournament,
      matches: matches,
      players_by_id: players_by_id,
      # Effective round timeout (same value the tournament page shows). Computed
      # here rather than per tick since it can hit the task provider.
      round_timeout_seconds: safe_current_round_timeout(tournament)
    )
  end

  defp safe_current_round_timeout(tournament) do
    Helpers.current_round_timeout_seconds(tournament)
  rescue
    _ -> nil
  end

  defp match_sort_key(%{state: state, id: id}) do
    {state_order(state), id || 0}
  end

  defp state_order("playing"), do: 0
  defp state_order("pending"), do: 1
  defp state_order("game_over"), do: 2
  defp state_order("timeout"), do: 3
  defp state_order("canceled"), do: 4
  defp state_order(_), do: 9

  defp sim_status_color(:running), do: "#22c55e"
  defp sim_status_color(:idle), do: "#94a3b8"
  defp sim_status_color(_), do: "#a4aab3"

  # Order by tournament place first (1, 2, 3, …; unranked players last), then by
  # id — never by name.
  defp players_sorted(players_by_id) do
    players_by_id
    |> Map.values()
    |> Enum.sort_by(&{&1.place || 99_999, &1.id})
  end

  # Display name as "name(N)" where N is the seeded simulator number. Simulator
  # ids are hardcoded as 100_001..100_200, so subtracting 100_000 yields 1..200.
  defp player_label(player) do
    "#{player.name}(#{player.id - 100_000})"
  end

  # «За какое место играет участник» в плей-офф top200 (позиции 5/6/7 = раунды 6/7/8).
  # Возвращает map player_id => подпись для ТЕКУЩЕГО раунда, чтобы в списке игроков были
  # видны финалисты. Для марафона (поз. 0..4) и других типов турниров — пусто.
  defp player_slot_labels(%{type: "top200", current_round_position: pos}, matches) when pos in 5..7 do
    labels = round_slot_labels(pos)

    matches
    |> Enum.filter(&(&1.round_position == pos))
    |> Enum.sort_by(& &1.id)
    # per_round_pair: у пары 2 матча за раунд — берём по одному на пару в порядке создания.
    |> Enum.uniq_by(&Enum.sort(&1.player_ids))
    |> Enum.zip(labels)
    |> Enum.flat_map(fn {match, label} -> Enum.map(match.player_ids || [], &{&1, label}) end)
    |> Map.new()
  end

  defp player_slot_labels(_tournament, _matches), do: %{}

  # Подписи пар в порядке создания матчей раунда (см. Top200.build_round_pairs).
  # Каждая подпись — {текст, ярус}: :top (борьба за верхнюю половину — фиолетовый бейдж),
  # :other (утешительная сетка — бейдж в цвет клана).
  #   поз. 5 (QF, «раунд 6»):     4 пары #1v#8/#4v#5/#3v#6/#2v#7 — выход в топ-4;
  #   поз. 6 (SF, «раунд 7»):     2 пары основной сетки 1-4, 2 утешительной 5-8;
  #   поз. 7 (финалы, «раунд 8»): 1-2 / 3-4 / 5-6 / 7-8.
  defp round_slot_labels(5), do: List.duplicate({"выход в топ-4", :top}, 4)
  defp round_slot_labels(6), do: [{"1-4", :top}, {"1-4", :top}, {"5-8", :other}, {"5-8", :other}]
  defp round_slot_labels(7), do: [{"1-2", :top}, {"3-4", :top}, {"5-6", :other}, {"7-8", :other}]
  defp round_slot_labels(_pos), do: []

  defp parse_delay_ms(raw) do
    case Float.parse(to_string(raw)) do
      {sec, _} when sec >= 0 -> trunc(sec * 1000)
      _ -> 0
    end
  end

  # Games for a player, filtered by the active view:
  #   * "current"  → only games in the tournament's current round
  #   * "playing"  → only games currently being played
  #   * "history"  → every game across all rounds
  defp player_games(matches, player_id, current_round, filter) do
    matches
    |> Enum.filter(&(player_id in (&1.player_ids || []) and not is_nil(&1.game_id)))
    |> Enum.map(&%{game_id: &1.game_id, state: &1.state, round: &1.round_position})
    |> Enum.filter(&game_matches_filter?(&1, current_round, filter))
    # Sort so the newest game (highest round, then highest game_id) ends up
    # rightmost in the list.
    |> Enum.sort_by(&{&1.round || 0, &1.game_id})
  end

  # Human-readable status shown next to each game button.
  defp game_status_label("playing"), do: "active"
  defp game_status_label("game_over"), do: "finished"
  defp game_status_label("timeout"), do: "timeout"
  defp game_status_label("canceled"), do: "canceled"
  defp game_status_label("pending"), do: "pending"
  defp game_status_label(other), do: to_string(other)

  defp game_status_color("playing"), do: "#4cd964"
  defp game_status_color("game_over"), do: "#64748b"
  defp game_status_color("timeout"), do: "#f59e0b"
  defp game_status_color("canceled"), do: "#ef4444"
  defp game_status_color(_), do: "#475569"

  defp game_matches_filter?(_game, _current_round, "history"), do: true
  defp game_matches_filter?(game, _current_round, "playing"), do: game.state == "playing"
  defp game_matches_filter?(game, current_round, "current"), do: game.round == current_round

  # "Round N" (1-based), derived from current_round_position.
  defp round_name(%{current_round_position: pos}), do: "Round #{(pos || 0) + 1}"

  # Short status next to the round name, mirroring the tournament page header:
  #   * active            → "ends in HH:MM:SS"  (last_round_started_at + timeout)
  #   * active + break on → "next round in HH:MM:SS" (last_round_ended_at + break)
  #   * finished          → "finished"
  defp round_status(%{state: "finished"}, _timeout, _now), do: "finished"

  defp round_status(%{state: "active", break_state: "on"} = tournament, _timeout, now) do
    case break_remaining_seconds(tournament, now) do
      nil -> "break"
      secs -> "next round in #{format_hms(secs)}"
    end
  end

  defp round_status(%{state: "active"} = tournament, timeout, now) do
    case round_remaining_seconds(tournament, timeout, now) do
      nil -> nil
      secs -> "ends in #{format_hms(secs)}"
    end
  end

  defp round_status(_tournament, _timeout, _now), do: nil

  defp round_remaining_seconds(%{last_round_started_at: nil}, _timeout, _now), do: nil
  defp round_remaining_seconds(_tournament, timeout, _now) when not is_integer(timeout), do: nil

  defp round_remaining_seconds(tournament, timeout, now) do
    elapsed = NaiveDateTime.diff(now, tournament.last_round_started_at)
    max(timeout - elapsed, 0)
  end

  defp break_remaining_seconds(%{last_round_ended_at: nil}, _now), do: nil

  defp break_remaining_seconds(tournament, now) do
    elapsed = NaiveDateTime.diff(now, tournament.last_round_ended_at)
    max((tournament.break_duration_seconds || 0) - elapsed, 0)
  end

  # HH:MM:SS, matching the tournament page (e.g. "00:04:49").
  defp format_hms(total_seconds) when total_seconds >= 0 do
    Enum.map_join(
      [div(total_seconds, 3600), total_seconds |> rem(3600) |> div(60), rem(total_seconds, 60)],
      ":",
      &(&1 |> Integer.to_string() |> String.pad_leading(2, "0"))
    )
  end

  defp widget_url(tournament_id, widget) do
    base = "/tournaments/#{tournament_id}/stream?fullscreen=true&widget=#{widget.key}"

    case widget.params do
      "" -> base
      params -> base <> "&" <> params
    end
  end

  @impl true
  def render(assigns) do
    playing_count = Enum.count(assigns.matches, &(&1.state == "playing"))
    current_round = assigns.tournament.current_round_position

    # Pair each player with the games visible under the active filter; drop
    # players that have no games to show.
    players_with_games =
      assigns.players_by_id
      |> players_sorted()
      |> Enum.map(fn player ->
        {player, player_games(assigns.matches, player.id, current_round, assigns.filter)}
      end)
      |> Enum.reject(fn {_player, games} -> games == [] end)

    autoselect_delay_sec = (assigns.autoselect_delay_ms || 0) / 1000

    assigns =
      assign(assigns,
        players_with_games: players_with_games,
        playing_count: playing_count,
        autoselect_delay_sec: autoselect_delay_sec,
        player_slot_labels: player_slot_labels(assigns.tournament, assigns.matches)
      )

    ~H"""
    <div class="container-fluid px-0">
      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-4 mb-3">
        <div class="d-flex align-items-center justify-content-between flex-wrap">
          <div>
            <h2 class="text-white mb-1">Stream Admin · {@tournament.name}</h2>
            <small class="cb-text">
              Playing: {@playing_count} · Active game: {if @active_game_id,
                do: "##{@active_game_id}",
                else: "—"}
            </small>
          </div>
          <div class="d-flex" style="gap:8px">
            <a
              class="btn btn-sm btn-outline-primary cb-rounded"
              href={"/tournaments/#{@tournament.id}/stream?fullscreen=true"}
              target="_blank"
            >
              Open full stream
            </a>
            <a
              class="btn btn-sm btn-outline-info cb-rounded"
              href={"/admin/tournaments/#{@tournament.id}/stream/state"}
              target="_blank"
            >
              JSON state
            </a>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger cb-rounded"
              phx-click="clear_active"
              disabled={is_nil(@active_game_id)}
            >
              Clear active
            </button>
          </div>
        </div>
      </div>

      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-3 mb-3">
        <form
          phx-submit="save_autoselect_delay"
          class="d-flex align-items-end flex-wrap"
          style="gap:12px"
        >
          <div>
            <label class="cb-text small mb-1 d-block">Auto-select next game delay (sec)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="120"
              name="autoselect_delay_sec"
              value={@autoselect_delay_sec}
              class="form-control form-control-sm cb-bg-highlight-panel text-white cb-border-color"
              style="max-width:160px"
            />
          </div>
          <button type="submit" class="btn btn-sm btn-primary cb-rounded">Save</button>
          <small class="cb-text" style="max-width:560px">
            When a pair finishes and their next (rematch) game starts, the stream auto-switches to it
            after this delay. 0 = instant.
          </small>
        </form>
      </div>

      <%= if @simulator_enabled do %>
        <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-3 mb-3">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h4 class="text-white mb-0">Simulator</h4>
            <div>
              <span
                class="badge cb-rounded"
                style={"background:" <> sim_status_color(@simulator.status) <> ";color:#0b1220;font-weight:700"}
              >
                {@simulator.status}
              </span>
              <span class="cb-text ml-2" style="font-size:12px">
                scheduled: {@simulator.scheduled_count}
              </span>
            </div>
          </div>

          <%= unless @bots_globally_enabled do %>
            <div class="alert alert-warning py-2 px-3 mb-3" style="font-size:13px">
              ⚠ Bots are globally disabled. Enable the <code>enable_simulator_bots</code>
              feature flag for bots to type and submit.
            </div>
          <% end %>

          <div class="d-flex flex-wrap mb-3" style="gap:8px">
            <button
              type="button"
              phx-click="sim_start"
              class="btn btn-sm btn-success cb-rounded"
              disabled={@simulator.status == :running}
            >
              ▶ Start
            </button>
            <button
              type="button"
              phx-click="sim_pause"
              class="btn btn-sm btn-outline-secondary cb-rounded"
              disabled={@simulator.status != :running}
            >
              ⏸ Pause bots
            </button>
            <button
              type="button"
              phx-click="sim_resume"
              class="btn btn-sm btn-outline-info cb-rounded"
              disabled={@simulator.status == :running}
            >
              ⏵ Resume bots
            </button>
            <button
              type="button"
              phx-click="sim_retry"
              class="btn btn-sm btn-outline-warning cb-rounded"
              data-confirm="Reset matches and re-run from round 0?"
            >
              ⟳ Retry
            </button>
            <button
              type="button"
              phx-click="sim_stop"
              class="btn btn-sm btn-outline-danger cb-rounded"
              data-confirm="Stop the simulator and finish the tournament? Final results will be calculated. Use Retry instead if you want to re-run with the same players."
            >
              ⏹ Stop
            </button>
          </div>

          <form phx-change="sim_settings" phx-submit="sim_settings">
            <div class="row">
              <div class="col-sm-4 mb-2">
                <label class="cb-text small mb-1">Avg solve time (sec)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="600"
                  name="avg_seconds"
                  value={@simulator.settings.avg_seconds}
                  class="form-control form-control-sm cb-bg-highlight-panel text-white cb-border-color"
                />
              </div>
              <div class="col-sm-4 mb-2">
                <label class="cb-text small mb-1">Jitter (% of avg)</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  name="jitter_pct"
                  value={@simulator.settings.jitter_pct}
                  class="form-control form-control-sm cb-bg-highlight-panel text-white cb-border-color"
                />
              </div>
              <div class="col-sm-4 mb-2">
                <label class="cb-text small mb-1">Top-rated win probability</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="1"
                  name="win_skew"
                  value={@simulator.settings.win_skew}
                  class="form-control form-control-sm cb-bg-highlight-panel text-white cb-border-color"
                />
              </div>
            </div>
            <small class="cb-text">
              Bots submit full python solutions from <code>task.solutions["python"]</code>.
              Each match's winner is deterministic per pair; the chosen player submits after the random delay above.
            </small>
          </form>
        </div>
      <% end %>

      <details
        id="obs-stream-urls"
        phx-update="ignore"
        class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-2 mb-3"
      >
        <summary class="text-white" style="cursor:pointer;font-size:14px;font-weight:600">
          OBS / stream URLs
          <span class="cb-text ml-1" style="font-size:12px;font-weight:400">({length(@widgets)})</span>
        </summary>
        <ul class="list-group mt-2">
          <%= for widget <- @widgets do %>
            <% url = widget_url(@tournament.id, widget) %>
            <li class="list-group-item d-flex justify-content-between align-items-center cb-bg-highlight-panel cb-border-color py-1">
              <div class="text-truncate mr-2" style="min-width:0">
                <strong class="text-white mr-2" style="font-size:13px">{widget.label}</strong>
                <code class="cb-text" style="font-size:11px">{url}</code>
              </div>
              <a
                href={url}
                target="_blank"
                class="btn btn-sm btn-outline-primary cb-rounded ml-2 py-0"
              >
                Open
              </a>
            </li>
          <% end %>
        </ul>
      </details>

      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 class="text-white mb-0">Matches</h4>
            <%= if @filter == "current" do %>
              <small class="cb-text">
                {round_name(@tournament)}
                <%= if status = round_status(@tournament, @round_timeout_seconds, @now) do %>
                  · <span class="text-white">{status}</span>
                <% end %>
              </small>
            <% end %>
          </div>
          <div class="d-flex align-items-center" style="gap:8px">
            <div class="btn-group btn-group-sm" role="group">
              <button
                type="button"
                phx-click="set_filter"
                phx-value-filter="current"
                class={"btn cb-rounded " <> if @filter == "current", do: "btn-primary", else: "btn-outline-primary"}
              >
                Current round
              </button>
              <button
                type="button"
                phx-click="set_filter"
                phx-value-filter="playing"
                class={"btn cb-rounded " <> if @filter == "playing", do: "btn-primary", else: "btn-outline-primary"}
              >
                Playing
              </button>
              <button
                type="button"
                phx-click="set_filter"
                phx-value-filter="history"
                class={"btn cb-rounded " <> if @filter == "history", do: "btn-primary", else: "btn-outline-primary"}
              >
                History
              </button>
            </div>
            <small class="cb-text">{length(@players_with_games)} players</small>
          </div>
        </div>

        <%= if @players_with_games == [] do %>
          <div class="text-center cb-text py-4">No players to show.</div>
        <% else %>
          <ul class="list-group">
            <%= for {{player, games}, idx} <- Enum.with_index(@players_with_games, 1) do %>
              <% slot = @player_slot_labels[player.id] %>
              <li class="list-group-item d-flex justify-content-between align-items-center cb-bg-highlight-panel cb-border-color">
                <div class="d-flex align-items-center" style="gap:10px;min-width:0">
                  <span class="cb-text" style="font-size:12px;width:24px;text-align:right">{idx}.</span>
                  <strong class="text-white text-truncate">{player_label(player)}</strong>
                  <%= if player.clan && player.clan != "" do %>
                    <span
                      class="badge cb-rounded text-truncate"
                      style="background:#334155;color:#cbd5e1;max-width:160px"
                    >
                      {player.clan}
                    </span>
                  <% end %>
                  <span class="badge cb-rounded" style="background:#1e293b;color:#fff">
                    {player.score || 0}
                  </span>
                  <%= if slot do %>
                    <% {slot_text, slot_tier} = slot %>
                    <span
                      class="badge cb-rounded"
                      style={
                        if slot_tier == :top,
                          do: "background:#7c3aed;color:#fff",
                          else: "background:#334155;color:#cbd5e1"
                      }
                    >
                      {slot_text}
                    </span>
                  <% end %>
                </div>
                <div class="d-flex flex-wrap justify-content-end align-items-end" style="gap:6px">
                  <%= for g <- games do %>
                    <% is_active = g.game_id == @active_game_id %>
                    <div class="d-flex flex-column align-items-center" style="gap:3px">
                      <button
                        type="button"
                        phx-click="set_active"
                        phx-value-game_id={g.game_id}
                        title={"round #{g.round} · #{g.state}"}
                        class={"btn btn-sm cb-rounded " <> if is_active, do: "btn-success", else: "btn-outline-success"}
                      >
                        {if is_active, do: "✓ ", else: ""}#{g.game_id}
                      </button>
                      <span
                        class="badge cb-rounded"
                        style={"font-size:10px;color:#fff;background:#{game_status_color(g.state)}"}
                      >
                        {game_status_label(g.state)}
                      </span>
                    </div>
                  <% end %>
                </div>
              </li>
            <% end %>
          </ul>
        <% end %>
      </div>
    </div>
    """
  end
end
