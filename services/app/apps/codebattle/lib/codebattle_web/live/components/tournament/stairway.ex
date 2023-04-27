defmodule CodebattleWeb.Live.Tournament.StairwayComponent do
  use CodebattleWeb, :live_component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.ChatComponent
  alias CodebattleWeb.Live.Tournament.HeaderComponent
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
        <div class="col-10 bg-white shadow-sm p-4">
          <.live_component
            id="t-header"
            module={HeaderComponent}
            tournament={@tournament}
            current_user={@current_user}
            time={@time}
          />
          <%= if is_waiting_participants?(@tournament) do %>
            <%= if @time.days == 0 and @time.hours == 0 and @time.minutes >= 0 and @time.seconds >= 0 do %>
              <h3 class="ml-3">
                The tournament will start in <%= @time.minutes %> min(s), <%= @time.seconds %> sec(s)
              </h3>
            <% else %>
              <%= if (@time.days >= 0 and @time.hours > 0) do %>
                <h3 class="ml-3">
                  The tournament will start ~ in <%= @time.days * 24 + @time.hours %> hour(s)
                </h3>
              <% else %>
                <h3 class="ml-3">The tournament will start soon</h3>
              <% end %>
            <% end %>
          <% end %>
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
