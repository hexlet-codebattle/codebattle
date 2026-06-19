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

    {:ok,
     socket
     |> assign(
       layout: {CodebattleWeb.LayoutView, :admin},
       tournament: tournament,
       current_user: current_user,
       active_game_id: TournamentAdminChannel.get_active_game(tournament.id),
       filter: "playing",
       widgets: @widgets,
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
  def handle_event("set_filter", %{"filter" => filter}, socket) do
    {:noreply, assign(socket, filter: filter)}
  end

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

  def handle_event("sim_" <> action, params, socket) do
    if socket.assigns.simulator_enabled do
      tid = socket.assigns.tournament.id

      case action do
        "start" -> Simulator.start(tid)
        "pause" -> Simulator.pause(tid)
        "resume" -> Simulator.resume(tid)
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
  defp sim_status_color(:paused), do: "#f59e0b"
  defp sim_status_color(:idle), do: "#94a3b8"
  defp sim_status_color(_), do: "#a4aab3"

  defp state_color("playing"), do: "#22c55e"
  defp state_color("pending"), do: "#94a3b8"
  defp state_color("timeout"), do: "#f59e0b"
  defp state_color("canceled"), do: "#64748b"
  defp state_color(_), do: "#a4aab3"

  defp filter_matches(matches, "playing", _active), do: Enum.filter(matches, &(&1.state == "playing"))

  defp filter_matches(matches, "live", active) do
    Enum.filter(matches, &(&1.state == "playing" or &1.game_id == active))
  end

  defp filter_matches(matches, _all, _active), do: matches

  defp player_name(players_by_id, id) do
    case Map.get(players_by_id, id) do
      nil -> "##{id}"
      %{name: name} -> name
      _ -> "##{id}"
    end
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
    visible_matches = filter_matches(assigns.matches, assigns.filter, assigns.active_game_id)
    playing_count = Enum.count(assigns.matches, &(&1.state == "playing"))
    assigns = assign(assigns, visible_matches: visible_matches, playing_count: playing_count)

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
              phx-click="sim_pause"
              class="btn btn-sm btn-warning cb-rounded"
              disabled={@simulator.status != :running}
            >
              ⏸ Pause
            </button>
            <button
              type="button"
              phx-click="sim_resume"
              class="btn btn-sm btn-info cb-rounded"
              disabled={@simulator.status != :paused}
            >
              ⏵ Continue
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
              data-confirm="Stop the simulator process? (you can re-start it again)"
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

      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-3 mb-3">
        <h4 class="text-white mb-3">OBS / stream URLs</h4>
        <ul class="list-group">
          <%= for widget <- @widgets do %>
            <% url = widget_url(@tournament.id, widget) %>
            <li class="list-group-item d-flex justify-content-between align-items-center cb-bg-highlight-panel cb-border-color">
              <div class="text-truncate mr-2" style="min-width:0">
                <strong class="text-white mr-2">{widget.label}</strong>
                <code class="cb-text" style="font-size:12px">{url}</code>
              </div>
              <a href={url} target="_blank" class="btn btn-sm btn-outline-primary cb-rounded ml-2">
                Open
              </a>
            </li>
          <% end %>
        </ul>
      </div>

      <div class="cb-bg-panel cb-rounded cb-border-color border shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4 class="text-white mb-0">Matches</h4>
          <div class="btn-group btn-group-sm" role="group">
            <%= for {key, label} <- [{"playing", "Playing"}, {"live", "Live + Active"}, {"all", "All"}] do %>
              <button
                type="button"
                phx-click="set_filter"
                phx-value-filter={key}
                class={"btn cb-rounded " <> if @filter == key, do: "btn-primary", else: "btn-outline-primary"}
              >
                {label}
              </button>
            <% end %>
          </div>
        </div>

        <%= if @visible_matches == [] do %>
          <div class="text-center cb-text py-4">No matches to show.</div>
        <% else %>
          <ul class="list-group">
            <%= for m <- @visible_matches do %>
              <% is_active = m.game_id && m.game_id == @active_game_id %>
              <li
                class="list-group-item d-flex justify-content-between align-items-center cb-bg-highlight-panel cb-border-color"
                style={"border-left:4px solid " <> if is_active, do: "#22c55e", else: "transparent"}
              >
                <div style="min-width:0">
                  <div class="d-flex align-items-center" style="gap:10px">
                    <span
                      class="badge text-uppercase"
                      style={"background:" <> state_color(m.state) <> ";color:#0b1220;font-weight:700"}
                    >
                      {m.state}
                    </span>
                    <span style="font-family:Menlo,monospace;font-size:13px" class="text-white">
                      round {m.round_id || m.round_position || "?"} · match #{m.id}
                    </span>
                    <%= if m.game_id do %>
                      <span class="cb-text" style="font-size:12px">game #{m.game_id}</span>
                    <% end %>
                  </div>
                  <div class="mt-1 text-white" style="font-size:15px">
                    <%= for {pid, idx} <- Enum.with_index(m.player_ids || []) do %>
                      <%= if idx > 0 do %>
                        <span class="cb-text mx-2">vs</span>
                      <% end %>
                      <strong>{player_name(@players_by_id, pid)}</strong>
                    <% end %>
                    <%= if (m.player_ids || []) == [] do %>
                      <span class="cb-text">no players</span>
                    <% end %>
                  </div>
                </div>
                <div class="d-flex align-items-center" style="gap:6px">
                  <%= if m.game_id do %>
                    <a
                      href={"/games/#{m.game_id}"}
                      target="_blank"
                      class="btn btn-sm btn-outline-secondary cb-rounded"
                    >
                      Game
                    </a>
                  <% end %>
                  <button
                    type="button"
                    phx-click="set_active"
                    phx-value-game_id={m.game_id}
                    disabled={is_nil(m.game_id)}
                    class={"btn btn-sm cb-rounded " <> if is_active, do: "btn-success", else: "btn-outline-success"}
                  >
                    {if is_active, do: "✓ Live", else: "Set Live"}
                  </button>
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
