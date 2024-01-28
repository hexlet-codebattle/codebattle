defmodule CodebattleWeb.Live.Tournament.TeamRoundComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.PlayerComponent

  def render(assigns) do
    ~H"""
    <div class="col-12 mt-3 py-2 bg-white shadow-sm rounded">
      <div class="row mb-3">
        <div class="col-5">
          <h3 class="font-weight-light mb-0">Round <%= @round %></h3>
        </div>
        <%= for round_result <- calc_round_result(@matches) do %>
          <div class="col-1 text-center">
            <span class="h3 font-weight-light mb-0"><%= round_result %></span>
          </div>
        <% end %>
      </div>

      <%= for match <- @matches do %>
        <div class={get_match_bg_class(match, @current_user_id)}>
          <%= for player_id  <- match.player_ids do %>
            <div class="col-5">
              <PlayerComponent.render player={get_player(@tournament, player_id)} />
            </div>
          <% end %>
          <div class="col-2 text-right">
            <%= link(get_game_link_name(match, @current_user_id),
              to: "/games/#{match.game_id}",
              class: "btn btn-success btn-sm m-1"
            ) %>
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  def get_game_link_name(match, player_id) do
    case {match.state, match_player?(match, player_id)} do
      {"pending", true} -> "Pending"
      {"playing", true} -> "Join"
      _ -> "Show"
    end
  end

  def get_match_bg_class(match, player_id) do
    if match_player?(match, player_id) do
      "row align-items-center py-2 bg-light"
    else
      "row align-items-center py-2"
    end
  end
end
