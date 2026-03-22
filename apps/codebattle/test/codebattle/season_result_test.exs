defmodule Codebattle.SeasonResultTest do
  use Codebattle.DataCase

  alias Codebattle.Season
  alias Codebattle.SeasonResult
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentUserResult

  describe "aggregate_season_results/1 and query helpers" do
    test "aggregates finished non-open tournaments within the season and exposes leaderboard helpers" do
      season = insert_season("Spring 2026", 2026, ~D[2026-01-01], ~D[2026-03-31])
      older_season = insert_season("Winter 2025", 2025, ~D[2025-10-01], ~D[2025-12-31])
      clan = insert(:clan)

      user1 = insert(:user, name: "Alpha", avatar_url: "https://example.com/a.png", clan_id: clan.id)
      user2 = insert(:user, name: "Beta", avatar_url: "https://example.com/b.png")
      user3 = insert(:user, name: "Gamma", avatar_url: "https://example.com/c.png")

      january =
        insert_finished_tournament(%{
          name: "January Masters",
          grade: "masters",
          started_at: ~U[2026-01-10 12:00:00Z]
        })

      march =
        insert_finished_tournament(%{
          name: "March Pro",
          grade: "pro",
          started_at: ~U[2026-03-15 12:00:00Z]
        })

      _open_tournament =
        insert_finished_tournament(%{
          name: "Open Cup",
          grade: "open",
          started_at: ~U[2026-02-10 12:00:00Z]
        })

      _outside_season =
        insert_finished_tournament(%{
          name: "April Pro",
          grade: "pro",
          started_at: ~U[2026-04-10 12:00:00Z]
        })

      _unfinished =
        insert_tournament(%{
          name: "Upcoming Elite",
          grade: "elite",
          state: "upcoming",
          started_at: ~U[2026-02-15 12:00:00Z]
        })

      insert_tournament_user_result(january,
        user: user1,
        clan: clan,
        place: 1,
        points: 16,
        score: 300,
        games_count: 5,
        wins_count: 4,
        total_time: 120,
        user_lang: "js"
      )

      insert_tournament_user_result(january,
        user: user2,
        place: 2,
        points: 8,
        score: 180,
        games_count: 5,
        wins_count: 3,
        total_time: 130,
        user_lang: "rb"
      )

      insert_tournament_user_result(march,
        user: user1,
        clan: clan,
        place: 2,
        points: 8,
        score: 150,
        games_count: 4,
        wins_count: 3,
        total_time: 100,
        user_lang: "js"
      )

      insert_tournament_user_result(march,
        user: user2,
        place: 1,
        points: 16,
        score: 170,
        games_count: 4,
        wins_count: 4,
        total_time: 110,
        user_lang: "py"
      )

      assert {:ok, 2} = SeasonResult.aggregate_season_results(season)

      [first, second] = SeasonResult.get_by_season(season.id)

      assert first.user_id == user1.id
      assert first.place == 1
      assert first.avatar_url == user1.avatar_url
      assert first.clan_id == clan.id
      assert first.clan_name == clan.name
      assert first.total_points == 24
      assert first.total_score == 450
      assert first.tournaments_count == 2
      assert first.total_games_count == 9
      assert first.total_wins_count == 7
      assert first.best_place == 1
      assert first.total_time == 220
      assert first.avg_place == Decimal.new("1.50")

      assert second.user_id == user2.id
      assert second.place == 2
      assert second.avatar_url == user2.avatar_url
      assert second.total_points == 24
      assert second.total_score == 350

      assert [leader] = SeasonResult.get_leaderboard(season.id, 1)
      assert leader.user_id == user1.id

      by_user = SeasonResult.get_by_user(season.id, user2.id)
      assert by_user.user_id == user2.id
      assert by_user.avatar_url == user2.avatar_url

      nearby = SeasonResult.get_nearby_users(season.id, user1.id, 1)
      assert Enum.map(nearby, & &1.user_id) == [user2.id]
      assert SeasonResult.get_nearby_users(season.id, user3.id, 1) == []

      top_users = SeasonResult.get_top_users(season.id, 1)
      assert Enum.map(top_users, & &1.user_id) == [user1.id]

      Repo.insert!(%SeasonResult{
        season_id: older_season.id,
        user_id: user1.id,
        user_name: user1.name,
        place: 3,
        total_points: 5
      })

      history = SeasonResult.get_by_user_history(user1.id)

      assert Enum.map(history, & &1.season_id) == [season.id, older_season.id]
      assert hd(history).season_name == season.name
    end

    test "returns detailed stats for a player and nil when the player has no season result" do
      season = insert_season("Spring 2026", 2026, ~D[2026-01-01], ~D[2026-03-31])
      user = insert(:user, name: "Detailed", avatar_url: "https://example.com/d.png")
      other_user = insert(:user)
      missing_user = insert(:user)

      early_tournament =
        insert_finished_tournament(%{
          name: "Masters Week 1",
          grade: "masters",
          started_at: ~U[2026-01-05 12:00:00Z]
        })

      late_tournament =
        insert_finished_tournament(%{
          name: "Pro Finals",
          grade: "pro",
          started_at: ~U[2026-03-20 12:00:00Z]
        })

      insert_tournament_user_result(early_tournament,
        user: user,
        place: 1,
        points: 16,
        score: 210,
        games_count: 5,
        wins_count: 4,
        total_time: 140,
        user_lang: "js"
      )

      insert_tournament_user_result(early_tournament,
        user: other_user,
        place: 2,
        points: 8,
        score: 180,
        games_count: 5,
        wins_count: 3,
        total_time: 150,
        user_lang: "rb"
      )

      insert_tournament_user_result(late_tournament,
        user: user,
        place: 3,
        points: 4,
        score: 120,
        games_count: 4,
        wins_count: 2,
        total_time: 100,
        user_lang: "py"
      )

      insert_tournament_user_result(late_tournament,
        user: other_user,
        place: 1,
        points: 16,
        score: 220,
        games_count: 4,
        wins_count: 4,
        total_time: 90,
        user_lang: "ex"
      )

      assert {:ok, 2} = SeasonResult.aggregate_season_results(season.id)

      stats = SeasonResult.get_player_detailed_stats(season.id, user.id)

      assert stats.season_result.user_id == user.id
      assert Enum.map(stats.grade_stats, & &1.grade) == ["masters", "pro"]

      assert Enum.at(stats.grade_stats, 0) == %{
               grade: "masters",
               tournaments_count: 1,
               total_points: 16,
               total_score: 210,
               total_games: 5,
               total_wins: 4,
               best_place: 1,
               avg_place: 1.0,
               total_time: 140,
               podium_finishes: [1]
             }

      assert Enum.map(stats.recent_tournaments, & &1.tournament_name) == ["Pro Finals", "Masters Week 1"]
      assert hd(stats.recent_tournaments).total_participants == 2

      assert Enum.map(stats.performance_trend, & &1.week) == [~D[2026-01-05], ~D[2026-03-16]]
      assert Enum.map(stats.performance_trend, & &1.avg_place) == [1.0, 3.0]

      assert SeasonResult.get_player_detailed_stats(season.id, missing_user.id) == nil
    end
  end

  describe "clean_results/1 and changeset/2" do
    test "deletes only results for the requested season and validates required fields" do
      season = insert_season("Spring 2026", 2026, ~D[2026-01-01], ~D[2026-03-31])
      another_season = insert_season("Summer 2026", 2026, ~D[2026-04-01], ~D[2026-06-30])
      user = insert(:user)

      Repo.insert!(%SeasonResult{season_id: season.id, user_id: user.id, user_name: user.name})
      Repo.insert!(%SeasonResult{season_id: another_season.id, user_id: user.id, user_name: user.name})

      assert {1, nil} = SeasonResult.clean_results(season.id)
      assert SeasonResult.get_by_season(season.id) == []
      another_season_id = another_season.id
      assert [%SeasonResult{season_id: ^another_season_id}] = SeasonResult.get_by_season(another_season.id)

      changeset = SeasonResult.changeset(%SeasonResult{}, %{})

      refute changeset.valid?
      assert {"can't be blank", _} = Keyword.fetch!(changeset.errors, :season_id)
      assert {"can't be blank", _} = Keyword.fetch!(changeset.errors, :user_id)
    end
  end

  defp insert_season(name, year, starts_at, ends_at) do
    {:ok, season} =
      Season.create(%{
        name: name,
        year: year,
        starts_at: starts_at,
        ends_at: ends_at
      })

    season
  end

  defp insert_tournament(attrs) do
    params =
      Map.merge(
        %{
          name: "Tournament #{System.unique_integer([:positive])}",
          description: "test tournament",
          starts_at: DateTime.utc_now(),
          started_at: DateTime.utc_now(),
          grade: "challenger",
          state: "finished"
        },
        attrs
      )

    %Tournament{}
    |> Tournament.changeset(params)
    |> Repo.insert!()
  end

  defp insert_finished_tournament(attrs) do
    insert_tournament(Map.put(attrs, :state, "finished"))
  end

  defp insert_tournament_user_result(tournament, opts) do
    user = Keyword.fetch!(opts, :user)
    clan = Keyword.get(opts, :clan)

    Repo.insert!(%TournamentUserResult{
      tournament_id: tournament.id,
      user_id: user.id,
      user_name: user.name,
      user_lang: Keyword.get(opts, :user_lang, user.lang || "js"),
      clan_id: clan && clan.id,
      clan_name: clan && clan.name,
      place: Keyword.fetch!(opts, :place),
      points: Keyword.fetch!(opts, :points),
      score: Keyword.fetch!(opts, :score),
      games_count: Keyword.fetch!(opts, :games_count),
      wins_count: Keyword.fetch!(opts, :wins_count),
      total_time: Keyword.fetch!(opts, :total_time),
      avg_result_percent: Decimal.new("100.0")
    })
  end
end
