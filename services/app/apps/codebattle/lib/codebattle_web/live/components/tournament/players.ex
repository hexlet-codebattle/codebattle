defmodule CodebattleWeb.Live.Tournament.PlayersComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.PlayerComponent

  def render(assigns) do
    ~H"""
    <div class="mt-2 bg-white shadow-sm p-2">
      <div class="d-flex align-items-center flex-wrap justify-content-start">
        <h5 class="mb-2 mr-5">Total players: <%= Enum.count(@players) %></h5>
      </div>
      <div class="my-2">
        <%= if !Enum.empty?(@players) do %>
          <%= for {player, i} <- Enum.with_index(Enum.take(@players, 42)) do %>
            <div class="my-3 d-flex">
              <span><%= i %></span>
              <div class="ml-4">
                <PlayerComponent.render player={player} />
              </div>
              <%= if can_moderate?(@tournament, @current_user)  and waiting_participants?(@tournament) do %>
                <button
                  class="btn btn-link btn-sm text-danger"
                  phx-click="kick"
                  phx-value-user_id={player.id}
                >
                  Kick
                </button>
              <% end %>
            </div>
          <% end %>
        <% else %>
          <p>NO_PARTICIPANTS_YET</p>
        <% end %>
      </div>
    </div>
    """
  end
end
