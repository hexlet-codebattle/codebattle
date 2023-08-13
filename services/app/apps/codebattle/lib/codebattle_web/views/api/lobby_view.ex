defmodule CodebattleWeb.Api.LobbyView do
  use CodebattleWeb, :view

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias CodebattleWeb.Api.GameView

  def render_lobby_params(current_user) do
    user_active_games =
      %{is_tournament: false}
      |> Game.Context.get_active_games()
      |> Enum.filter(&can_user_see_game?(&1, current_user))

    tournaments = Tournament.Context.list_live_and_finished(current_user)

    %{games: games} =
      Game.Context.get_completed_games(
        %{},
        %{page_size: 20, total: false, page_number: 1}
      )

    completed_games = GameView.render_completed_games(games)

    %{
      active_games: user_active_games,
      tournaments: tournaments,
      completed_games: completed_games
    }
  end

  def can_user_see_game?(game, user) do
    game.visibility_type == "public" || Game.Helpers.is_player?(game, user)
  end
end
