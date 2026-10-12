defmodule CodebattleWeb.Api.V1.LeaderboardController do
  use CodebattleWeb, :controller

  alias Codebattle.Leaderboard
  alias Codebattle.Season

  @periods %{"week" => :week, "month" => :month, "year" => :year, "all" => :all}
  @season_tabs 4
  @max_page_size 50

  def elo(conn, params) do
    period = Map.get(@periods, params["period"], :week)

    json(conn, Leaderboard.elo(period, page_opts(params), conn.assigns.current_user))
  end

  # Standings of `season_id`, or of the current season when it's absent. Also
  # lists the latest seasons so the client can offer them as tabs.
  def season(conn, params) do
    seasons = Leaderboard.recent_seasons(@season_tabs)
    season = selected_season(params["season_id"], seasons)
    result = Leaderboard.season(season, page_opts(params), conn.assigns.current_user)

    json(
      conn,
      result
      |> Map.put(:season, season && present_season(season))
      |> Map.put(:seasons, Enum.map(seasons, &present_season/1))
    )
  end

  defp selected_season(nil, _seasons), do: Season.get_current_season()

  defp selected_season(id, seasons) do
    case Integer.parse(to_string(id)) do
      {season_id, ""} -> Enum.find(seasons, &(&1.id == season_id)) || Season.get(season_id)
      _ -> Season.get_current_season()
    end
  end

  defp present_season(season), do: Map.take(season, [:id, :name, :year, :starts_at, :ends_at])

  defp page_opts(params) do
    %{
      page: params |> parse_int("page", 1) |> max(1),
      page_size: params |> parse_int("page_size", 10) |> max(1) |> min(@max_page_size)
    }
  end

  defp parse_int(params, key, default) do
    case Integer.parse(to_string(params[key] || "")) do
      {value, ""} -> value
      _ -> default
    end
  end
end
