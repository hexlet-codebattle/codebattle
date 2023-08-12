defmodule CodebattleWeb.Live.Tournament.HeaderComponent do
  use CodebattleWeb, :live_component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.NextRoundTimerComponent

  @impl true
  def mount(socket) do
    {:ok, assign(socket, initialized: false)}
  end

  @impl true
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
      <%= if @tournament.is_live and @tournament.state in ["active", "waiting_participants"] do %>
        <.live_component
          id="t-timer"
          module={NextRoundTimerComponent}
          break_duration_seconds={@tournament.break_duration_seconds}
          break_state={@tournament.break_state}
          last_round_ended_at={@tournament.last_round_ended_at}
          last_round_started_at={@tournament.last_round_started_at}
          match_timeout_seconds={@tournament.match_timeout_seconds}
          starts_at={@tournament.starts_at}
          tournament_state={@tournament.state}
        />
      <% end %>
    </div>
    """
  end
end
