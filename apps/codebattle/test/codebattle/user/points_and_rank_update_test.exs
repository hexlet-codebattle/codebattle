defmodule Codebattle.User.PointsAndRankUpdateTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Season
  alias Codebattle.SeasonCache
  alias Codebattle.SeasonResult
  alias Codebattle.User.PointsAndRankUpdate

  test "updates points and ranks from persisted season results" do
    today = Date.utc_today()

    {:ok, season} =
      Season.create(%{
        name: "Ranking season",
        year: today.year,
        starts_at: today,
        ends_at: Date.add(today, 30)
      })

    winner = insert(:user, rating: 1_000, points: 1, rank: 99)
    fallback_high = insert(:user, rating: 900, points: 2, rank: 98)
    fallback_low = insert(:user, rating: 800, points: 3, rank: 97)
    bot = insert(:user, is_bot: true, points: 777, rank: 7)

    %SeasonResult{}
    |> SeasonResult.changeset(%{
      season_id: season.id,
      user_id: winner.id,
      place: 1,
      total_points: 250
    })
    |> Repo.insert!()

    assert %{num_rows: 3} = PointsAndRankUpdate.update(season)

    assert %{points: 250, rank: 1} = Repo.reload!(winner)
    assert %{points: 0, rank: 2} = Repo.reload!(fallback_high)
    assert %{points: 0, rank: 3} = Repo.reload!(fallback_low)
    assert %{points: 777, rank: 7} = Repo.reload!(bot)
  end

  test "falls back to date-range rankings when there is no configured season" do
    SeasonCache.invalidate()
    high = insert(:user, rating: 500, points: 50, rank: 50)
    low = insert(:user, rating: 100, points: 10, rank: 10)

    assert %{num_rows: 2} = PointsAndRankUpdate.update()

    assert %{points: 0, rank: 1} = Repo.reload!(high)
    assert %{points: 0, rank: 2} = Repo.reload!(low)
  end
end
