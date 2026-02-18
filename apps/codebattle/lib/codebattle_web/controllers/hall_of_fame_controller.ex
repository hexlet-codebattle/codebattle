defmodule CodebattleWeb.HallOfFameController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Season
  alias Codebattle.SeasonResult

  plug(:put_view, CodebattleWeb.HallOfFameView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, _params) do
    current_season = Season.get_current_season()

    # Get current season leaderboard
    current_season_results =
      if current_season do
        SeasonResult.get_leaderboard(current_season.id, 100)
      else
        []
      end

    # Get previous seasons winners (top 3 from each finished season)
    previous_seasons = Season.get_all()

    previous_seasons_winners =
      previous_seasons
      |> Enum.reject(fn s -> current_season && s.id == current_season.id end)
      |> Enum.map(fn season ->
        winners = SeasonResult.get_leaderboard(season.id, 3)
        %{season: season, winners: winners}
      end)
      |> Enum.reject(fn %{winners: winners} -> Enum.empty?(winners) end)

    conn
    |> put_meta_tags(%{
      title: "Codebattle Hall of Fame",
      description: "Hall of Fame for Codebattle League"
    })
    |> put_gon(%{
      current_season: current_season,
      current_season_results: current_season_results,
      previous_seasons_winners: previous_seasons_winners
    })
    |> render("index.html")
  end
end
