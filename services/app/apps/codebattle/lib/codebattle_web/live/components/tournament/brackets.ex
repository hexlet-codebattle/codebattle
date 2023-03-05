defmodule CodebattleWeb.Live.Tournament.BracketsComponent do
  use CodebattleWeb, :component

  import Codebattle.Tournament.Helpers

  alias CodebattleWeb.Live.Tournament.MatchComponent

  def render(assigns) do
    ~H"""
    <div>
      <div class="overflow-auto">
        <div class="bracket">
          <.render_round
            tournament={@tournament}
            players_count={@tournament.players_count}
            type={:r1}
            current_user_id={@current_user_id}
          />
          <.render_round
            tournament={@tournament}
            players_count={@tournament.players_count}
            type={:r2}
            current_user_id={@current_user_id}
          />
          <.render_round
            tournament={@tournament}
            players_count={@tournament.players_count}
            type={:r3}
            current_user_id={@current_user_id}
          />
          <.render_round
            tournament={@tournament}
            players_count={@tournament.players_count}
            type={:r4}
            current_user_id={@current_user_id}
          />
          <.render_round
            tournament={@tournament}
            players_count={@tournament.players_count}
            type={:quater}
            current_user_id={@current_user_id}
          />
          <.render_round
            tournament={@tournament}
            players_count={@tournament.players_count}
            type={:semi}
            current_user_id={@current_user_id}
          />
          <.render_round
            tournament={@tournament}
            players_count={@tournament.players_count}
            type={:final}
            current_user_id={@current_user_id}
          />
        </div>
      </div>
    </div>
    """
  end

  def render_round(%{type: :r1, players_count: pc} = assigns) when pc < 65, do: ~H(<div></div>)
  def render_round(%{type: :r2, players_count: pc} = assigns) when pc < 33, do: ~H(<div></div>)
  def render_round(%{type: :r3, players_count: pc} = assigns) when pc < 17, do: ~H(<div></div>)
  def render_round(%{type: :r4, players_count: pc} = assigns) when pc < 9, do: ~H(<div></div>)
  def render_round(%{type: :quater, players_count: pc} = assigns) when pc < 5, do: ~H(<div></div>)
  def render_round(%{type: :semi, players_count: pc} = assigns) when pc < 3, do: ~H(<div></div>)
  def render_round(%{type: :semi, players_count: pc} = assigns) when pc < 3, do: ~H(<div></div>)

  def render_round(assigns) do
    ~H"""
    <div class="round">
      <div class="h4 text-center">
        <%= get_round_name(@type) %>
      </div>
      <div class="round-inner">
        <%= for match <- get_matches_by_round(@tournament, @type, @players_count) do %>
          <div class="match">
            <div class="match__content">
              <MatchComponent.render
                players={get_match_players(@tournament, match)}
                match={match}
                current_user_id={@current_user_id}
              />
            </div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end

  defp get_round_name(:r1), do: "Round_1"
  defp get_round_name(:r2), do: "Round_2"
  defp get_round_name(:r3), do: "Round_3"
  defp get_round_name(:r4), do: "Round_4"
  defp get_round_name(:quater), do: "Quater"
  defp get_round_name(:semi), do: "Semi"
  defp get_round_name(:final), do: "Final"

  defp get_matches_by_round(_t, :r1, players_count) when players_count < 128, do: []
  defp get_matches_by_round(_t, :r2, players_count) when players_count < 64, do: []
  defp get_matches_by_round(_t, :r3, players_count) when players_count < 32, do: []
  defp get_matches_by_round(_t, :r4, players_count) when players_count < 16, do: []
  defp get_matches_by_round(_t, :quater, players_count) when players_count < 8, do: []
  defp get_matches_by_round(_t, :semi, players_count) when players_count < 4, do: []
  defp get_matches_by_round(_t, :final, players_count) when players_count < 2, do: []

  defp get_matches_by_round(tournament, :r1, players_count) do
    get_matches(tournament, (players_count - 128)..(players_count - 65))
  end

  defp get_matches_by_round(tournament, :r2, players_count) do
    get_matches(tournament, (players_count - 64)..(players_count - 33))
  end

  defp get_matches_by_round(tournament, :r3, players_count) do
    get_matches(tournament, (players_count - 32)..(players_count - 17))
  end

  defp get_matches_by_round(tournament, :r4, players_count) do
    get_matches(tournament, (players_count - 16)..(players_count - 9))
  end

  defp get_matches_by_round(tournament, :quater, players_count) do
    get_matches(tournament, (players_count - 8)..(players_count - 5))
  end

  defp get_matches_by_round(tournament, :semi, players_count) do
    get_matches(tournament, (players_count - 4)..(players_count - 3))
  end

  defp get_matches_by_round(tournament, :final, players_count) do
    get_matches(tournament, (players_count - 2)..(players_count - 2))
  end
end
