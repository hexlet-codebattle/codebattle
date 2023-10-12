defmodule CodebattleWeb.Live.Tournament.ScorePlayersComponent do
  use CodebattleWeb, :component

  alias CodebattleWeb.Live.Tournament.PlayerComponent

  def render(assigns) do
    ~H"""
    <div class="mt-2 bg-white shadow-sm p-2">
      <div class="d-flex align-items-center flex-wrap justify-content-start">
        <h5 class="mb-2 mr-5">Total players: <%= @players_count %></h5>
      </div>
      <div class="my-2">
        <%= for {player, i} <- Enum.with_index(Enum.take(@players, 42)) do %>
          <div class="my-3 d-flex">
            <span><%= i %></span>
            <div class="ml-4">
              <PlayerComponent.render player={player} max_score={@max_score} render_score={true} />
            </div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end
end
