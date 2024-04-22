defmodule CodebattleWeb.Live.Event.LeaderboardView do
  use CodebattleWeb, :live_view

  # require Logger
  import CodebattleWeb.Gettext

  @impl true
  def mount(_params, session, socket) do
    Gettext.put_locale(CodebattleWeb.Gettext, session["locale"])

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       leaderboard_list: session["leaderboard"]
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="d-flex w-100 px-1 bg-white">
      <table class="table table-striped cb-custom-event-table">
        <thead class="sticky-top text-muted">
          <tr>
            <th class="p-1 pl-4 font-weight-light border-0"><%= gettext("Place") %></th>
            <th class="p-1 pl-4 font-weight-light border-0"><%= gettext("Score") %></th>
            <th class="p-1 pl-4 font-weight-light border-0"><%= gettext("Clan players count") %></th>
            <th class="p-1 pl-4 font-weight-light border-0"><%= gettext("Clan") %></th>
          </tr>
        </thead>
        <tbody>
          <%= for item <- @leaderboard_list do %>
            <tr class="cb-custom-event-empty-space-tr"></tr>
            <tr class="text-dark font-weight-bold cb-custom-event-tr bg-light">
              <td class="p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0">
                <%= item.place %>
              </td>
              <td class="p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0">
                <%= item.score %>
              </td>
              <td class="p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0">
                <%= item.players_count %>
              </td>
              <td class="p-1 pl-4 my-2 align-middle text-nowrap position-relative cb-custom-event-td border-0">
                <%= item.clan_name %>
              </td>
            </tr>
          <% end %>
        </tbody>
      </table>
    </div>
    """
  end
end
