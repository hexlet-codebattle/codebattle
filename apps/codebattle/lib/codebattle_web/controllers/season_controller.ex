defmodule CodebattleWeb.SeasonController do
  use CodebattleWeb, :controller

  import PhoenixGon.Controller

  alias Codebattle.Season
  alias Codebattle.SeasonResult

  plug(:put_view, CodebattleWeb.SeasonView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def index(conn, _params) do
    seasons = Season.get_all()

    # Get top 3 for each season
    # Convert struct to map to ensure all fields (including :top3) are JSON encoded
    seasons_with_top3 =
      Enum.map(seasons, fn season ->
        top3 = SeasonResult.get_leaderboard(season.id, 3)

        %{
          id: season.id,
          name: season.name,
          year: season.year,
          starts_at: season.starts_at,
          ends_at: season.ends_at,
          top3: top3
        }
      end)

    conn
    |> put_meta_tags(%{
      title: "Codebattle Seasons",
      description: "Browse all Codebattle seasons and their results"
    })
    |> put_gon(%{seasons: seasons_with_top3})
    |> render("index.html")
  end

  def show(conn, %{"id" => id}) do
    season = Season.get!(id)
    results = SeasonResult.get_by_season(season.id)

    conn
    |> put_meta_tags(%{
      title: "#{season.name} #{season.year} - Season Results",
      description: "Results for #{season.name} #{season.year} season"
    })
    |> put_gon(%{season: season, results: results})
    |> render("show.html")
  end
end
