defmodule CodebattleWeb.Live.Tournament.MatchComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.PlayerComponent

  def render(assigns) do
    ~H"""
    <div>
      <%= if !is_nil(@match) do %>
        <div class={get_match_bg_class(@match, @current_user_id)}>
          <div class="d-flex justify-content-center align-items-center">
            <span><%= @match.state %></span>
            <div :if={@match.game_id}>
              <%= link(get_game_link_name(@match, @current_user_id),
                to: "/games/#{@match.game_id}",
                class: "btn btn-success btn-sm m-1"
              ) %>
            </div>
          </div>
          <div class="d-flex flex-column justify-content-around">
            <%= for player <- @players do %>
              <div class={"d-flex align-items-center bg-light tournament-bg-#{@match.state}"}>
                <PlayerComponent.render player={player} />
                <span class={get_result_class(@match, player.id)}></span>
              </div>
            <% end %>
          </div>
        </div>
      <% else %>
        <div class="d-flex align-items-center justify-content-center x-bg-gray">
          <p>Waiting</p>
        </div>
      <% end %>
    </div>
    """
  end

  def get_match_bg_class(match, player_id) do
    if is_match_player?(match, player_id) do
      "p-1 border border-success bg-winner"
    else
      "p-1 border border-success"
    end
  end

  def get_game_link_name(match, player_id) do
    case {match.state, is_match_player?(match, player_id)} do
      {"pending", true} -> "Pending"
      {"playing", true} -> "Join"
      _ -> "Show"
    end
  end

  def get_result_class(match, player_id) do
    if match.winner_id == player_id do
      "fa fa-trophy"
    else
      nil
    end
  end
end
