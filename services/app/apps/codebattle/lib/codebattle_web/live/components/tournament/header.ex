defmodule CodebattleWeb.Live.Tournament.HeaderComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.NextRoundTimerComponent

  def render(assigns) do
    ~H"""
    <div>
      <div class="d-flex align-items-center border-bottom">
        <h1 class="m-0 text-capitalize text-nowrap"><%= @tournament.name %></h1>
        <div class="text-center ml-3" data-placement="right" data-toggle="tooltip">
          <img alt={@tournament.level} src={"/assets/images/levels/#{@tournament.level}.svg"} />
        </div>

        <%= if is_waiting_participants?(@tournament) do %>
          <div class="ml-auto">
            <%= if is_individual?(@tournament) do %>
              <%= if is_player?(@tournament, @current_user.id) do %>
                <button class="btn btn-outline-danger" phx-click="leave">
                  Leave
                </button>
              <% else %>
                <button class="btn btn-outline-secondary" phx-click="join">Join</button>
              <% end %>
            <% end %>

            <%= if is_stairway?(@tournament) do %>
              <%= if is_player?(@tournament, @current_user.id) do %>
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
                <a href={Routes.tournament_path(@socket, :edit, @tournament.id)}>Edit</a>
              </button>
              <button class="btn btn-info ml-2" phx-click="restart">Restart</button>
              <button class="btn btn-danger ml-2" phx-click="cancel">Cancel</button>
              <%= if !is_public?(@tournament) do %>
                <button class="btn btn-danger ml-2" phx-click="open_up">Open Up</button>
              <% end %>
            <% end %>
          </div>
        <% end %>

        <%= if is_active?(@tournament) do %>
          <div class="ml-auto">
            <%= if can_moderate?(@tournament, @current_user) do %>
              <button class="btn btn-info ml-2" phx-click="restart">Restart</button>
              <button class="btn btn-danger ml-2" phx-click="cancel">Cancel</button>
              <%= if !is_public?(@tournament) do %>
                <button class="btn btn-danger ml-2" phx-click="open_up">Open Up</button>
              <% end %>
            <% end %>
          </div>
        <% end %>
        <%= if is_finished?(@tournament) do %>
          <div class="ml-auto">
            <%= if can_moderate?(@tournament, @current_user) do %>
              <button class="btn btn-info ml-2" phx-click="restart">Restart</button>
              <%= if !is_public?(@tournament) do %>
                <button class="btn btn-danger ml-2" phx-click="open_up">Open Up</button>
              <% end %>
            <% end %>
          </div>
        <% end %>
      </div>
      <div class="d-flex align-items-center mt-2">
        <div class="small text-muted">
          <span>State: <%= @tournament.state %></span>
          <span class="ml-3">Type: <%= @tournament.type %></span>
          <span class="ml-3">PlayersLimit: <%= @tournament.players_limit %></span>
          <%= if can_moderate?(@tournament, @current_user) do %>
            <span class="ml-3">Access: <%= @tournament.access_type %></span>
            <span class="ml-3">IsLive: <%= @tournament.is_live %></span>
          <% end %>
          <%= if is_visible_by_token?(@tournament) && can_moderate?(@tournament, @current_user) do %>
            <span class="ml-3">
              Private url: <%= Routes.tournament_url(@socket, :show, @tournament.id,
                access_token: @tournament.access_token
              ) %>
            </span>
          <% end %>
        </div>
      </div>
      <NextRoundTimerComponent.render
        id="t-timer"
        tournament={@tournament}
        next_round_time={@next_round_time}
        time_now={@time_now}
        user_timezone={@user_timezone}
      />
    </div>
    """
  end
end
