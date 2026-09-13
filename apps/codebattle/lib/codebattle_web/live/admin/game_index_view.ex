defmodule CodebattleWeb.Live.Admin.Game.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Game.Context

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       games: list_online_games(),
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("reload", _params, socket) do
    {:noreply, assign(socket, games: list_online_games())}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="cb-container-xl cb-bg-panel cb-shadow-sm cb-rounded cb-py-4 cb-mt-3">
      <div class="cb-d-flex cb-justify-between cb-align-center">
        <h1 class="cb-text-white cb-mb-0">Online Games</h1>
        <button class="cb-btn cb-btn-secondary cb-rounded" phx-click="reload">
          Reload
        </button>
      </div>

      <p class="cb-text cb-mt-2 cb-mb-0">Active games now: {length(@games)}</p>

      <%= if @games == [] do %>
        <p class="cb-text-white cb-mt-3 cb-mb-0">No active games.</p>
      <% else %>
        <div class="cb-table-responsive cb-mt-4">
          <table class="cb-table cb-table-sm">
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color cb-border-bottom">id</th>
                <th class="cb-border-color cb-border-bottom">state</th>
                <th class="cb-border-color cb-border-bottom">mode</th>
                <th class="cb-border-color cb-border-bottom">level</th>
                <th class="cb-border-color cb-border-bottom">players</th>
                <th class="cb-border-color cb-border-bottom">started_at</th>
                <th class="cb-border-color cb-border-bottom">link</th>
              </tr>
            </thead>
            <tbody>
              <%= for game <- @games do %>
                <tr>
                  <td class="cb-align-middle cb-text-white cb-border-color">{game.id}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{game.state}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{game.mode}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">{game.level}</td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    {players_text(game.players)}
                  </td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    {format_datetime(game.starts_at)}
                  </td>
                  <td class="cb-align-middle cb-text-white cb-border-color">
                    <a href={Routes.game_path(@socket, :show, game.id)} class="cb-text-primary">
                      Open game
                    </a>
                  </td>
                </tr>
              <% end %>
            </tbody>
          </table>
        </div>
      <% end %>
    </div>
    """
  end

  defp list_online_games do
    Enum.sort_by(Context.get_active_games(), & &1.id, :desc)
  end

  defp players_text(players) do
    Enum.map_join(players, " vs ", & &1.name)
  end

  defp format_datetime(nil), do: "-"
  defp format_datetime(datetime), do: Calendar.strftime(datetime, "%Y-%m-%d %H:%M:%S")
end
