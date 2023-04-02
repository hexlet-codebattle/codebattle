defmodule CodebattleWeb.Live.Tournament.StairwayRoundComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.PlayerComponent

  def render(assigns) do
    ~H"""
    <%= if @round <= @current_round do %>
      <div class="col-12 mt-3">
        <h3 class="text-center">Round <%= @round %></h3>
        <h3 class="text-center">Task: <%= Map.get(@round_task, :name) %></h3>
        <h3 class="text-center">
          Description: <%= Map.get(@round_task, :description_en) ||
            Map.get(@round_task, :description_ru) %>
        </h3>
        <h3 class="text-center">Pairing</h3>
        <%= for match <- @matches do %>
          <div class={get_match_bg_class(match, @current_user_id)}>
            <div class="d-flex px-3 justify-content-start align-items-center">
              <div
                class={"d-flex align-items-center tournament-bg-#{match.state}"}
                style="flex-basis:300px"
              >
                <PlayerComponent.render
                  render_score={true}
                  max_score={(@tournament.current_round + 1) * 10}
                  player={get_player(@tournament, Enum.at(match.player_ids, 0))}
                />
                <span class={get_result_class(match, Enum.at(match.player_ids, 0))}></span>
              </div>
              <div
                class={"d-flex align-items-center tournament-bg-#{match.state}"}
                style="flex-basis:300px"
              >
                <PlayerComponent.render
                  render_score={true}
                  max_score={(@tournament.current_round + 1) * 10}
                  player={get_player(@tournament, Enum.at(match.player_ids, 1))}
                />
                <span class={get_result_class(match, Enum.at(match.player_ids, 1))}></span>
              </div>
              <span style="flex-basis:100px"><%= match.state %></span>
              <div style="flex-basis:100px">
                <%= link(get_game_link_name(match, @current_user_id),
                  to: "/games/#{match.game_id}",
                  class: "btn btn-success btn-sm m-1"
                ) %>
              </div>
            </div>
          </div>
        <% end %>
      </div>
    <% else %>
      <div class="col-12 mt-3">
        <h3 class="text-center">Not started yet</h3>
      </div>
    <% end %>
    """
  end

  def get_game_link_name(match, player_id) do
    case {match.state, is_match_player?(match, player_id)} do
      {"pending", true} -> "Pending"
      {"playing", true} -> "Join"
      _ -> "Show"
    end
  end

  def get_match_bg_class(match, player_id) do
    if is_match_player?(match, player_id) do
      "p-1 border border-success bg-winner"
    else
      "p-1 border border-success"
    end
  end

  def get_result_class(match, player_id) do
    if match.winner_id == player_id, do: "fa fa-trophy", else: nil
  end
end
