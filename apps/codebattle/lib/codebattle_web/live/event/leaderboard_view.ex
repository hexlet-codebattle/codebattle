defmodule CodebattleWeb.Live.Event.LeaderboardView do
  use CodebattleWeb, :live_view
  use Gettext, backend: CodebattleWeb.Gettext

  @impl true
  def mount(_params, session, socket) do
    {:ok,
     assign(socket,
       current_user: session["current_user"],
       leaderboard_list: session["leaderboard"]
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="cb-d-flex cb-w-100 cb-px-1 cb-bg-white">
      <table class="cb-table cb-table-striped cb-custom-event-table">
        <thead class="cb-sticky-top cb-text-muted cb-bg-white">
          <tr>
            <th class="cb-p-1 cb-pl-4 cb-fw-light cb-border-0">{gettext("Place")}</th>
            <th class="cb-p-1 cb-pl-4 cb-fw-light cb-border-0">{gettext("Score")}</th>
            <th class="cb-p-1 cb-pl-4 cb-fw-light cb-border-0">{gettext("Clan players count")}</th>
            <th class="cb-p-1 cb-pl-4 cb-fw-light cb-border-0">{gettext("Clan")}</th>
          </tr>
        </thead>
        <tbody>
          <%= for item <- @leaderboard_list do %>
            <tr class="cb-custom-event-empty-space-tr"></tr>
            <tr class="cb-text-dark cb-fw-bold cb-custom-event-tr cb-bg-light">
              <td class="cb-p-1 cb-pl-4 cb-my-2 cb-align-middle cb-text-nowrap cb-position-relative cb-custom-event-td cb-border-0">
                {item.place}
              </td>
              <td class="cb-p-1 cb-pl-4 cb-my-2 cb-align-middle cb-text-nowrap cb-position-relative cb-custom-event-td cb-border-0">
                {item.score}
              </td>
              <td class="cb-p-1 cb-pl-4 cb-my-2 cb-align-middle cb-text-nowrap cb-position-relative cb-custom-event-td cb-border-0">
                {item.players_count}
              </td>
              <td class="cb-p-1 cb-pl-4 cb-my-2 cb-align-middle cb-text-nowrap cb-position-relative cb-custom-event-td cb-border-0">
                {item.clan_name}
              </td>
            </tr>
          <% end %>
        </tbody>
      </table>
    </div>
    """
  end
end
