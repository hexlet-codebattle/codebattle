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
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-center">
        <h1 class="text-white mb-0">Online Games</h1>
        <button class="btn btn-secondary cb-btn-secondary cb-rounded" phx-click="reload">
          Reload
        </button>
      </div>

      <p class="cb-text mt-2 mb-0">Active games now: {length(@games)}</p>

      <%= if @games == [] do %>
        <p class="text-white mt-3 mb-0">No active games.</p>
      <% else %>
        <div class="table-responsive mt-4">
          <table class="table table-sm">
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color border-bottom">id</th>
                <th class="cb-border-color border-bottom">state</th>
                <th class="cb-border-color border-bottom">mode</th>
                <th class="cb-border-color border-bottom">level</th>
                <th class="cb-border-color border-bottom">players</th>
                <th class="cb-border-color border-bottom">started_at</th>
                <th class="cb-border-color border-bottom">link</th>
              </tr>
            </thead>
            <tbody>
              <%= for game <- @games do %>
                <tr>
                  <td class="align-middle text-white cb-border-color">{game.id}</td>
                  <td class="align-middle text-white cb-border-color">{game.state}</td>
                  <td class="align-middle text-white cb-border-color">{game.mode}</td>
                  <td class="align-middle text-white cb-border-color">{game.level}</td>
                  <td class="align-middle text-white cb-border-color">
                    {players_text(game.players)}
                  </td>
                  <td class="align-middle text-white cb-border-color">
                    {format_datetime(game.starts_at)}
                  </td>
                  <td class="align-middle text-white cb-border-color">
                    <a href={Routes.game_path(@socket, :show, game.id)} class="text-primary">
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
