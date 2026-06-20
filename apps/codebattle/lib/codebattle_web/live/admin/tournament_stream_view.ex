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
  defp sim_status_color(:idle), do: "#94a3b8"
  defp sim_status_color(_), do: "#a4aab3"

  defp players_sorted(players_by_id) do
    players_by_id
    |> Map.values()
    |> Enum.sort_by(&{-(&1.score || 0), &1.name})
  end

  defp player_games(matches, player_id) do
    matches
    |> Enum.filter(&(player_id in (&1.player_ids || []) and not is_nil(&1.game_id)))
    |> Enum.map(&%{game_id: &1.game_id, state: &1.state, round: &1.round_id || &1.round_position})
    |> Enum.sort_by(& &1.round)
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
    players = players_sorted(assigns.players_by_id)
    assigns = assign(assigns, players: players, playing_count: playing_count)

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
          <h4 class="text-white mb-0">Matches</h4>
          <small class="cb-text">{length(@players)} players</small>
        </div>

        <%= if @players == [] do %>
          <div class="text-center cb-text py-4">No players to show.</div>
        <% else %>
          <ul class="list-group">
            <%= for {player, idx} <- Enum.with_index(@players, 1) do %>
              <% games = player_games(@matches, player.id) %>
              <li class="list-group-item d-flex justify-content-between align-items-center cb-bg-highlight-panel cb-border-color">
                <div class="d-flex align-items-center" style="gap:10px;min-width:0">
                  <span class="cb-text" style="font-size:12px;width:24px;text-align:right">{idx}.</span>
                  <strong class="text-white text-truncate">{player.name}</strong>
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
                  <%= if games == [] do %>
                    <span class="cb-text" style="font-size:12px">no games</span>
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
