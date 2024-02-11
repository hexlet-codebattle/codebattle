defmodule CodebattleWeb.Api.LobbyView do
  use CodebattleWeb, :view

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias CodebattleWeb.Api.GameView

  def render_lobby_params(current_user) do
    tournaments = Tournament.Context.list_live_and_finished(current_user)

    %{games: games} =
      Game.Context.get_completed_games(
        %{},
        %{page_size: 20, total: false, page_number: 1}
      )

    completed_games = GameView.render_completed_games(games)

    %{
      active_games: render_active_games(current_user),
      tournaments: tournaments,
      completed_games: completed_games
    }
  end

  def render_active_games(current_user) do
    %{is_tournament: false}
    |> Game.Context.get_active_games()
    |> Enum.filter(&can_user_see_game?(&1, current_user))
  end

  def can_user_see_game?(game, user) do
    game.visibility_type == "public" || Game.Helpers.player?(game, user)
  end
end
