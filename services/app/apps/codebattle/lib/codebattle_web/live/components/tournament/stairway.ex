defmodule CodebattleWeb.Live.Tournament.StairwayComponent do
  use CodebattleWeb, :live_component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.ChatComponent
  alias CodebattleWeb.Live.Tournament.PlayersComponent
  alias CodebattleWeb.Live.Tournament.ScorePlayersComponent
  alias CodebattleWeb.Live.Tournament.StairwayRoundsComponent

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
          <%= if is_waiting_participants?(@tournament) do %>
            <PlayersComponent.render
              tournament={@tournament}
              current_user={@current_user}
              players={get_players(@tournament)}
            />
          <% end %>
        </div>
        <div class="col-10">
          <div class="bg-white shadow-sm p-4">
            <%= if !is_waiting_participants?(@tournament) do %>
              <div class="row">
                <div class="col-3">
                  <ScorePlayersComponent.render
                    tournament={@tournament}
                    players_count={@tournament.players_count}
                    current_user={@current_user}
                    players={players_ordered_by_score(@tournament)}
                  />
                </div>
                <div class="col-9">
                  <StairwayRoundsComponent.render
                    tournament={@tournament}
                    round_matches={get_round_matches(@tournament)}
                    current_user_id={@current_user.id}
                  />
                </div>
              </div>
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

  def players_ordered_by_score(tournament) do
    tournament |> get_players() |> Enum.sort_by(& &1.score, :desc)
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
