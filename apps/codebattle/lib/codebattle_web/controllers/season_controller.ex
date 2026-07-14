defmodule CodebattleWeb.SeasonController do
  use CodebattleWeb, :controller

  alias Codebattle.Season
  alias Codebattle.SeasonResult

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
    |> assign(:page_title, "Codebattle Seasons")
    |> render_inertia("Seasons", %{
      "page_title" => "Codebattle Seasons",
      "seasons" => seasons_with_top3
    })
  end

  def show(conn, %{"id" => id}) do
    season = Season.get!(id)
    results = SeasonResult.get_by_season(season.id)

    page_title = "#{season.name} #{season.year} - Season Results"

    conn
    |> put_meta_tags(%{
      title: page_title,
      description: "Results for #{season.name} #{season.year} season"
    })
    |> assign(:page_title, page_title)
    |> render_inertia("SeasonShow", %{
      "page_title" => page_title,
      "season" => season,
      "results" => results
    })
  end
end
