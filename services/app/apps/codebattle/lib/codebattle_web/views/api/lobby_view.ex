defmodule CodebattleWeb.Api.LobbyView do
  use CodebattleWeb, :view

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias CodebattleWeb.Api.GameView

  def render_lobby_params(current_user) do
    live_tournaments = Tournament.Context.get_live_tournaments_for_user(current_user)

    upcoming_tournaments = Tournament.Context.get_one_upcoming_tournament_for_each_grade()

    user_tournaments =
      Tournament.Context.get_user_tournaments(%{
        from: DateTime.utc_now(),
        to: DateTime.add(DateTime.utc_now(), 1 * 24 * 60 * 60),
        user_id: current_user.id
      })

    %{games: games} =
      Game.Context.get_completed_games(
        %{},
        %{page_size: 20, total: false, page_number: 1}
      )

    completed_games = GameView.render_completed_games(games)

    %{
      active_games: render_active_games(current_user),
      tournaments: [],
      live_tournaments: live_tournaments,
      user_tournaments: user_tournaments,
      upcoming_tournaments: upcoming_tournaments,
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
