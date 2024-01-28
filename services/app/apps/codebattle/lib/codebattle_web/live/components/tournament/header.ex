defmodule CodebattleWeb.Live.Tournament.HeaderComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  def render(assigns) do
    ~H"""
    <div>
      <div class="d-flex align-items-center border-bottom">
        <h1 class="m-0 text-capitalize text-nowrap"><%= @tournament.name %></h1>
        <div class="text-center ml-3" data-placement="right" data-toggle="tooltip">
          <img alt={@tournament.level} src={"/assets/images/levels/#{@tournament.level}.svg"} />
        </div>

        <%= if waiting_participants?(@tournament) do %>
          <div class="ml-auto">
            <%= if individual?(@tournament) do %>
              <%= if player?(@tournament, @current_user.id) do %>
                <button class="btn btn-outline-danger" phx-click="leave">
                  Leave
                </button>
              <% else %>
                <button class="btn btn-outline-secondary" phx-click="join">Join</button>
              <% end %>
            <% end %>

            <%= if stairway?(@tournament) do %>
              <%= if player?(@tournament, @current_user.id) do %>
                <button class="btn btn-outline-danger" phx-click="leave">Leave</button>
              <% else %>
                <button class="btn btn-outline-secondary" phx-click="join">Join</button>
              <% end %>
            <% end %>
            <%= if can_moderate?(@tournament, @current_user) do %>
              <button
                class="btn btn-success ml-2"
                phx-click="start"
                disabled={!can_be_started?(@tournament)}
              >
                Start
              </button>
              <button class="btn btn-warning ml-2">
                <a href={Routes.live_view_tournament_path(@socket, :edit, @tournament.id)}>Edit</a>
              </button>
              <button class="btn btn-info ml-2" phx-click="restart">Restart</button>
              <button class="btn btn-danger ml-2" phx-click="cancel">Cancel</button>
              <%= if !public?(@tournament) do %>
                <button class="btn btn-danger ml-2" phx-click="open_up">Open Up</button>
              <% end %>
            <% end %>
          </div>
        <% end %>

        <%= if active?(@tournament) do %>
          <div class="ml-auto">
            <%= if can_moderate?(@tournament, @current_user) do %>
              <button class="btn btn-info ml-2" phx-click="restart">Restart</button>
              <button class="btn btn-danger ml-2" phx-click="cancel">Cancel</button>
              <%= if !public?(@tournament) do %>
                <button class="btn btn-danger ml-2" phx-click="open_up">Open Up</button>
              <% end %>
            <% end %>
          </div>
        <% end %>
        <%= if finished?(@tournament) do %>
          <div class="ml-auto">
            <%= if can_moderate?(@tournament, @current_user) do %>
              <button class="btn btn-info ml-2" phx-click="restart">Restart</button>
              <%= if !public?(@tournament) do %>
                <button class="btn btn-danger ml-2" phx-click="open_up">Open Up</button>
              <% end %>
            <% end %>
          </div>
        <% end %>
      </div>
      <div class="d-flex align-items-center mt-2">
        <div class="small text-muted">
          <span class="ml-3">Type: <%= @tournament.type %></span>
          <%= if can_moderate?(@tournament, @current_user) do %>
            <span class="ml-3">IsLive: <%= @tournament.is_live %></span>
            <span class="ml-3">Access: <%= @tournament.access_type %></span>
          <% end %>
          <span class="ml-3">PlayersLimit: <%= @tournament.players_limit %></span>
          <%= if visible_by_token?(@tournament) && can_moderate?(@tournament, @current_user) do %>
            <span class="ml-3">
              Private url: <%= Routes.tournament_url(@socket, :show, @tournament.id,
                access_token: @tournament.access_token
              ) %>
            </span>
          <% end %>
        </div>
      </div>
    </div>
    """
  end
end
