defmodule CodebattleWeb.Live.Tournament.IndividualComponent do
  use CodebattleWeb, :live_component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.BracketsComponent
  alias CodebattleWeb.Live.Tournament.ChatComponent
  alias CodebattleWeb.Live.Tournament.PlayersComponent

  @impl true
  def mount(socket) do
    {:ok, assign(socket, initialized: false)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-fluid">
      <div class="row">
        <div class="col-2">
          <.live_component
            id="t-chat"
            module={ChatComponent}
            tournament={@tournament}
            current_user={@current_user}
            messages={@messages}
          />
          <PlayersComponent.render
            tournament={@tournament}
            current_user={@current_user}
            players={get_players(@tournament)}
          />
        </div>

        <div class="col-10">
          <div class="bg-white shadow-sm p-4">
            <%= if is_active?(@tournament) || is_finished?(@tournament) do %>
              <BracketsComponent.render tournament={@tournament} current_user_id={@current_user.id} />
            <% end %>
            <%= if is_waiting_participants?(@tournament) do %>
              <%= if is_player?(@tournament, @current_user.id) do %>
                <button class="btn btn-outline-danger" phx-click="leave">
                  Leave
                </button>
              <% else %>
                <button class="btn btn-outline-secondary" phx-click="join">Join</button>
              <% end %>
            <% end %>
          </div>
        </div>
      </div>
    </div>
    """
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
