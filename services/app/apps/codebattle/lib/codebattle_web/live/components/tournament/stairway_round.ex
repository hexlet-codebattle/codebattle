defmodule CodebattleWeb.Live.Tournament.StairwayRoundComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.PlayerComponent

  @fake_bot_player %{
    id: -10,
    avatar_url: "https://avatars3.githubusercontent.com/u/10835816",
    name: "Bot",
    score: 0,
    rating: 1200
  }

  def render(assigns) do
    ~H"""
    <%= if @round_position <= @current_round_position do %>
      <div class="col-12 mt-3">
        <h3 class="text-center">Round <%= @round_position %></h3>
        <%= if @round_task do %>
          <h4 class="text-center">Task: <%= @round_task.name %></h4>
          <p>Description: <%= @round_task.description_en %></p>
        <% end %>
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
                  max_score={(@tournament.current_round_position + 1) * 10}
                  player={get_player(@tournament, Enum.at(match.player_ids, 0)) || build_bot_player()}
                />
                <span class={get_result_class(match, Enum.at(match.player_ids, 0))}></span>
              </div>
              <div
                class={"d-flex align-items-center tournament-bg-#{match.state}"}
                style="flex-basis:300px"
              >
                <PlayerComponent.render
                  render_score={true}
                  max_score={(@tournament.current_round_position + 1) * 10}
                  player={get_player(@tournament, Enum.at(match.player_ids, 1)) || build_bot_player()}
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

  defp get_game_link_name(match, player_id) do
    case {match.state, is_match_player?(match, player_id)} do
      {"pending", true} -> "Pending"
      {"playing", true} -> "Join"
      _ -> "Show"
    end
  end

  defp get_match_bg_class(match, player_id) do
    if is_match_player?(match, player_id) do
      "p-1 border bg-winner"
    else
      "p-1 border"
    end
  end

  defp get_result_class(match, player_id) do
    if match.winner_id == player_id, do: "fa fa-trophy", else: nil
  end

  defp build_bot_player(), do: @fake_bot_player
end
