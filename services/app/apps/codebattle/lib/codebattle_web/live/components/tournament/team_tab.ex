defmodule CodebattleWeb.Live.Tournament.TeamTabComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.PlayersComponent

  def render(assigns) do
    ~H"""
    <div class="py-2 bg-white shadow-sm rounded">
      <div class="row align-items-center">
        <%= for team <- @teams do %>
          <div class="col-4">
            <h3 class="mb-0 px-3 font-weight-light"><%= team.title %></h3>
          </div>
          <div class="col-2 text-right">
            <span class="h1 px-3"><%= team.score %></span>
          </div>
        <% end %>
      </div>
      <div class="row px-3 pt-2">
        <%= for team <- @teams do %>
          <div class="col">
            <div class="d-flex align-items-center">
              <%= if is_waiting_participants?(@tournament) do %>
                <%= if is_player?(@tournament, @current_user.id, team.id) do %>
                  <button class="btn btn-outline-danger" phx-click="leave">Leave</button>
                <% else %>
                  <button class="btn btn-outline-info" phx-click="join" phx-value-team_id={team.id}>
                    Join
                  </button>
                <% end %>
              <% end %>
            </div>
            <PlayersComponent.render
              tournament={@tournament}
              current_user={@current_user}
              players={get_team_players(@tournament, team.id)}
            />
          </div>
        <% end %>
      </div>
    </div>
    """
  end
end
