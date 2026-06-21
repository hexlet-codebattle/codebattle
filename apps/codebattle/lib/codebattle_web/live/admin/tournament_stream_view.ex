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
      # Drive the "round ends in" countdown.
      Process.send_after(self(), :tick, 1000)
    end

    {:ok,
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
       simulator_enabled: simulator_enabled?(tournament)
     )
     |> assign_matches_and_players()
     |> assign_simulator_state()}
  end

  defp simulator_enabled?(%{meta: meta}) when is_map(meta) do
    meta["simulator"] == true or meta[:simulator] == true
  end

  defp simulator_enabled?(_), do: false

  defp assign_simulator_state(socket) do
    if socket.assigns.simulator_enabled do
      sim =
        case Simulator.get_state(socket.assigns.tournament.id) do
          nil -> %{status: :idle, settings: Simulator.default_settings(), scheduled_count: 0}
          other -> other
        end

      assign(socket, simulator: sim)
    else
      assign(socket, simulator: nil)
    end
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
    {:noreply, socket |> assign_matches_and_players() |> assign_simulator_state()}
  end

  def handle_info(:tick, socket) do
    Process.send_after(self(), :tick, 1000)
    {:noreply, assign(socket, now: NaiveDateTime.utc_now(:second))}
  end

  def handle_info(msg, socket) do
    Logger.debug("Stream admin LV unexpected: #{inspect(msg)}")
    {:noreply, socket}
  end

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

    assign(socket, tournament: tournament, matches: matches, players_by_id: players_by_id)
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
    |> Enum.sort_by(&(&1.round || 0))
  end

  defp game_matches_filter?(_game, _current_round, "history"), do: true
  defp game_matches_filter?(game, _current_round, "playing"), do: game.state == "playing"
  defp game_matches_filter?(game, current_round, "current"), do: game.round == current_round

  # "Round N" (1-based), derived from current_round_position.
  defp round_name(%{current_round_position: pos}), do: "Round #{(pos || 0) + 1}"

  # Short status shown next to the round name: break / finished / "ends in mm:ss".
  defp round_status(%{state: "finished"}, _now), do: "finished"
  defp round_status(%{break_state: "on"}, _now), do: "break"

  defp round_status(tournament, now) do
    case round_remaining_seconds(tournament, now) do
      nil -> nil
      secs -> "ends in #{format_mmss(secs)}"
    end
  end

  # Mirrors Tournament.Context: round timer only applies to per-round modes.
  defp round_remaining_seconds(%{timeout_mode: mode}, _now)
       when mode not in ["per_round_fixed", "per_round_with_rematch"], do: nil

  defp round_remaining_seconds(%{last_round_started_at: nil}, _now), do: nil
  defp round_remaining_seconds(%{round_timeout_seconds: nil}, _now), do: nil

  defp round_remaining_seconds(tournament, now) do
    elapsed = NaiveDateTime.diff(now, tournament.last_round_started_at)
    max(tournament.round_timeout_seconds - elapsed, 0)
  end

  defp format_mmss(total_seconds) when total_seconds >= 0 do
    minutes = div(total_seconds, 60)
    seconds = rem(total_seconds, 60)
    "#{minutes}:#{String.pad_leading(Integer.to_string(seconds), 2, "0")}"
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
        autoselect_delay_sec: autoselect_delay_sec
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

      <details class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-2 mb-3">
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
                <%= if status = round_status(@tournament, @now) do %>
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
              <li class="list-group-item d-flex justify-content-between align-items-center cb-bg-highlight-panel cb-border-color">
                <div class="d-flex align-items-center" style="gap:10px;min-width:0">
                  <span class="cb-text" style="font-size:12px;width:24px;text-align:right">{idx}.</span>
                  <strong class="text-white text-truncate">{player_label(player)}</strong>
                  <span class="badge cb-rounded" style="background:#1e293b;color:#fff">
                    {player.score || 0}
                  </span>
                </div>
                <div class="d-flex flex-wrap justify-content-end" style="gap:6px">
                  <%= for g <- games do %>
                    <% is_active = g.game_id == @active_game_id %>
                    <button
                      type="button"
                      phx-click="set_active"
                      phx-value-game_id={g.game_id}
                      title={"round #{g.round} · #{g.state}"}
                      class={"btn btn-sm cb-rounded " <> if is_active, do: "btn-success", else: "btn-outline-success"}
                    >
                      {if is_active, do: "✓ ", else: ""}#{g.game_id}
                    </button>
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
