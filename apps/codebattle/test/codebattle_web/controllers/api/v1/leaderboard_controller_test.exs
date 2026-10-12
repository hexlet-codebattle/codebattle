defmodule CodebattleWeb.Api.V1.LeaderboardControllerTest do
  # Not async: the season test swaps the global current-season cache.
  use CodebattleWeb.ConnCase

  alias Codebattle.Repo
  alias Codebattle.Season
  alias Codebattle.SeasonResult

  describe "elo" do
    test "all-time ranks people by rating, skips bots, returns the caller's row", %{conn: conn} do
      top = insert(:user, rating: 1500)
      me = insert(:user, rating: 1300)
      insert(:user, rating: 1400)
      insert(:user, rating: 2000, is_bot: true)

      body =
        conn
        |> log_in_user(me.id)
        |> get("/api/v1/leaderboard/elo", %{period: "all", page_size: "2"})
        |> json_response(200)

      assert [%{"id" => top_id, "position" => 1}, %{"position" => 2}] = body["entries"]
      assert top_id == top.id
      assert %{"id" => me_id, "position" => 3, "rating" => 1300} = body["me"]
      assert me_id == me.id
      assert %{"total_entries" => 3, "total_pages" => 2} = body["page_info"]
    end

    test "week ranks by Elo gained since Monday, counting games and wins", %{conn: conn} do
      since = Codebattle.Leaderboard.period_start(:week)
      recent = NaiveDateTime.add(since, 3600)
      old = NaiveDateTime.add(since, -24 * 3600)

      climber = insert(:user)
      steady = insert(:user)

      insert(:user_game, user: climber, rating_diff: 20, result: "won", inserted_at: recent)
      insert(:user_game, user: climber, rating_diff: -5, result: "lost", inserted_at: recent)
      insert(:user_game, user: steady, rating_diff: 8, result: "won", inserted_at: recent)
      # Before the window: must not count.
      insert(:user_game, user: steady, rating_diff: 100, result: "won", inserted_at: old)

      body =
        conn
        |> log_in_user(steady.id)
        |> get("/api/v1/leaderboard/elo", %{period: "week"})
        |> json_response(200)

      assert [first, second] = body["entries"]
      assert %{"gain" => 15, "games" => 2, "wins" => 1, "position" => 1} = first
      assert first["id"] == climber.id
      assert %{"gain" => 8, "games" => 1, "wins" => 1, "position" => 2} = second
      assert body["me"]["id"] == steady.id
    end
  end

  describe "season" do
    test "returns current season standings by place", %{conn: conn} do
      today = Date.utc_today()

      season =
        Repo.insert!(%Season{
          name: "Test",
          year: today.year,
          starts_at: Date.add(today, -10),
          ends_at: Date.add(today, 10)
        })

      Codebattle.SeasonCache.invalidate()
      on_exit(&Codebattle.SeasonCache.invalidate/0)

      [first, second] = insert_list(2, :user)

      Repo.insert!(%SeasonResult{
        season_id: season.id,
        user_id: second.id,
        user_name: second.name,
        place: 2,
        total_points: 8
      })

      Repo.insert!(%SeasonResult{
        season_id: season.id,
        user_id: first.id,
        user_name: first.name,
        place: 1,
        total_points: 64
      })

      body =
        conn
        |> log_in_user(second.id)
        |> get("/api/v1/leaderboard/season")
        |> json_response(200)

      assert body["season"]["name"] == "Test"
      assert [%{"name" => "Test"}] = body["seasons"]
      assert [%{"position" => 1, "points" => 64}, %{"position" => 2, "points" => 8}] = body["entries"]
      assert body["me"]["position"] == 2
    end

    test "season_id picks a past season", %{conn: conn} do
      today = Date.utc_today()
      user = insert(:user)

      past =
        Repo.insert!(%Season{
          name: "Past",
          year: today.year - 1,
          starts_at: Date.add(today, -200),
          ends_at: Date.add(today, -110)
        })

      current =
        Repo.insert!(%Season{
          name: "Now",
          year: today.year,
          starts_at: Date.add(today, -10),
          ends_at: Date.add(today, 80)
        })

      Codebattle.SeasonCache.invalidate()
      on_exit(&Codebattle.SeasonCache.invalidate/0)

      Repo.insert!(%SeasonResult{season_id: past.id, user_id: user.id, user_name: user.name, place: 1, total_points: 32})

      body =
        conn
        |> log_in_user(user.id)
        |> get("/api/v1/leaderboard/season", %{season_id: past.id})
        |> json_response(200)

      assert body["season"]["id"] == past.id
      assert [%{"position" => 1, "points" => 32}] = body["entries"]
      # Newest first: tabs read left to right from the current season.
      assert Enum.map(body["seasons"], & &1["id"]) == [current.id, past.id]
    end
  end
end
