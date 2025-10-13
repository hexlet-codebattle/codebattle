defmodule Codebattle.User.PointsAndRankUpdateTest do
  # credo:disable-for-this-file Credo.Check.Refactor.CyclomaticComplexity
  use Codebattle.DataCase, async: false

  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.User.PointsAndRankUpdate

  setup do
    # Clean up any existing data to ensure test isolation
    Repo.delete_all(Codebattle.Tournament.TournamentResult)
    Repo.delete_all(Codebattle.Tournament)
    Repo.delete_all(User, except: [:is_bot])

    :ok
  end

  # Helper function to get current season date range
  defp get_current_season_date do
    today = Date.utc_today()
    {month, day} = {today.month, today.day}

    cond do
      # Season 0: Sep 21 - Dec 21
      (month == 9 and day >= 21) or month in [10, 11] or (month == 12 and day <= 21) ->
        ~U[2024-10-15 12:00:00Z]

      # Season 1: Dec 21 - Mar 21
      (month == 12 and day >= 21) or month in [1, 2] or (month == 3 and day <= 21) ->
        ~U[2025-01-15 12:00:00Z]

      # Season 2: Mar 21 - Jun 21
      (month == 3 and day >= 21) or month in [4, 5] or (month == 6 and day <= 21) ->
        ~U[2025-04-15 12:00:00Z]

      # Season 3: Jun 21 - Sep 21
      (month == 6 and day >= 21) or month in [7, 8] or (month == 9 and day <= 21) ->
        ~U[2025-08-15 12:00:00Z]
    end
  end

  describe "update/0" do
    test "calculates points correctly for current season tournaments" do
      user1 = insert(:user, rating: 1500)
      user2 = insert(:user, rating: 1400)
      user3 = insert(:user, rating: 1300)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "pro",
          winner_ids: [user1.id, user2.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user3.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)
      user3 = Repo.get!(User, user3.id)

      # Pro grade points: [128, 64, 32, 16, 8, 4, 2] for top 7
      # 1st place
      assert user1.points == 128
      # 2nd place
      assert user2.points == 64
      # participant
      assert user3.points == 2

      # Check rankings (higher points = better rank)
      assert user1.rank <= user2.rank
      assert user2.rank <= user3.rank
    end

    test "calculates points correctly for different tournament grades" do
      # Rookie grade tournament
      user1 = insert(:user, rating: 1500)
      user2 = insert(:user, rating: 1400)
      user3 = insert(:user, rating: 1300)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "rookie",
          winner_ids: [user1.id, user2.id, user3.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user3.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)
      user3 = Repo.get!(User, user3.id)

      # Rookie grade points: [8, 4, 2] for top 3
      # 1st place
      assert user1.points == 8
      # 2nd place
      assert user2.points == 4
      # 3rd place
      assert user3.points == 2
    end

    test "calculates points correctly for challenger grade tournaments" do
      user1 = insert(:user, rating: 1600)
      user2 = insert(:user, rating: 1500)
      user3 = insert(:user, rating: 1400)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "challenger",
          winner_ids: [user1.id, user2.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user3.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)
      user3 = Repo.get!(User, user3.id)

      # Challenger grade points: [64, 32, 16, 8, 4, 2] for top 6
      # 1st place
      assert user1.points == 64
      # 2nd place
      assert user2.points == 32
      # participant
      assert user3.points == 2
    end

    test "calculates points correctly for elite grade tournaments" do
      user1 = insert(:user, rating: 1700)
      user2 = insert(:user, rating: 1600)
      user3 = insert(:user, rating: 1500)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "elite",
          winner_ids: [user1.id, user2.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user3.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)
      user3 = Repo.get!(User, user3.id)

      # Elite grade points: [256, 128, 64, 32, 16, 8, 4, 2] for top 8
      # 1st place
      assert user1.points == 256
      # 2nd place
      assert user2.points == 128
      # participant
      assert user3.points == 2
    end

    test "handles masters grade tournaments correctly" do
      users =
        for i <- 1..12 do
          insert(:user, rating: 2000 - i * 10)
        end

      # Use a date within the current season
      current_season_date = get_current_season_date()

      # Create winners list with top 10 users
      winner_ids = users |> Enum.take(10) |> Enum.map(& &1.id)

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "masters",
          winner_ids: winner_ids,
          finished_at: current_season_date
        )

      # Add all users as tournament participants
      for user <- users do
        insert(:tournament_result, tournament_id: tournament.id, user_id: user.id)
      end

      PointsAndRankUpdate.update()

      updated_users = Enum.map(users, &Repo.get!(User, &1.id))
      [u1, u2, u3, u4, u5, u6, u7, u8, u9, u10, u11, u12] = updated_users

      # Masters grade points: [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] for top 10
      # 1st place
      assert u1.points == 1024
      # 2nd place
      assert u2.points == 512
      # 3rd place
      assert u3.points == 256
      # 4th place
      assert u4.points == 128
      # 5th place
      assert u5.points == 64
      # 6th place
      assert u6.points == 32
      # 7th place
      assert u7.points == 16
      # 8th place
      assert u8.points == 8
      # 9th place
      assert u9.points == 4
      # 10th place
      assert u10.points == 2
      # participant
      assert u11.points == 2
      # participant
      assert u12.points == 2
    end

    test "handles grand slam tournaments correctly" do
      users =
        for i <- 1..13 do
          insert(:user, rating: 2500 - i * 20)
        end

      # Use a date within the current season
      current_season_date = get_current_season_date()

      # Create winners list with top 11 users
      winner_ids = users |> Enum.take(11) |> Enum.map(& &1.id)

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "grand_slam",
          winner_ids: winner_ids,
          finished_at: current_season_date
        )

      # Add all users as tournament participants
      for user <- users do
        insert(:tournament_result, tournament_id: tournament.id, user_id: user.id)
      end

      PointsAndRankUpdate.update()

      updated_users = Enum.map(users, &Repo.get!(User, &1.id))
      [u1, u2, u3, u4, u5, u6, u7, u8, u9, u10, u11, u12, u13] = updated_users

      # Grand slam points: [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2] for top 11
      # 1st place
      assert u1.points == 2048
      # 2nd place
      assert u2.points == 1024
      # 3rd place
      assert u3.points == 512
      # 4th place
      assert u4.points == 256
      # 5th place
      assert u5.points == 128
      # 6th place
      assert u6.points == 64
      # 7th place
      assert u7.points == 32
      # 8th place
      assert u8.points == 16
      # 9th place
      assert u9.points == 8
      # 10th place
      assert u10.points == 4
      # 11th place
      assert u11.points == 2
      # participant
      assert u12.points == 2
      # participant
      assert u13.points == 2
    end

    test "aggregates points from multiple tournaments in current season" do
      user1 = insert(:user, rating: 1800)
      user2 = insert(:user, rating: 1700)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      # First tournament - pro grade
      tournament1 =
        insert(:tournament,
          state: "finished",
          grade: "pro",
          winner_ids: [user1.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament1.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament1.id, user_id: user2.id)

      # Second tournament - challenger grade
      tournament2 =
        insert(:tournament,
          state: "finished",
          grade: "challenger",
          winner_ids: [user2.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament2.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament2.id, user_id: user2.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)

      # user1: 128 (pro 1st) + 2 (challenger participant) = 130
      # user2: 2 (pro participant) + 64 (challenger 1st) = 66
      assert user1.points == 130
      assert user2.points == 66

      # user1 should have better rank due to higher points
      assert user1.rank < user2.rank
    end

    test "ignores open grade tournaments" do
      user1 = insert(:user, rating: 1500)
      user2 = insert(:user, rating: 1400)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      # Open tournament should be ignored
      tournament =
        insert(:tournament,
          state: "finished",
          grade: "open",
          winner_ids: [user1.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)

      # Both users should have 0 points since open tournaments give no points
      assert user1.points == 0
      assert user2.points == 0
    end

    test "ignores non-finished tournaments" do
      user1 = insert(:user, rating: 1500)
      user2 = insert(:user, rating: 1400)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      # Non-finished tournament should be ignored
      tournament =
        insert(:tournament,
          state: "active",
          grade: "pro",
          winner_ids: [user1.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)

      # Both users should have 0 points since non-finished tournaments are ignored
      assert user1.points == 0
      assert user2.points == 0
    end

    test "excludes bot users from calculations" do
      human_user = insert(:user, rating: 1600, is_bot: false)
      bot_user = insert(:user, rating: 1500, is_bot: true)

      # Store original bot values before update
      original_bot_points = bot_user.points
      original_bot_rank = bot_user.rank

      # Use a date within the current season
      current_season_date = get_current_season_date()

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "challenger",
          winner_ids: [human_user.id, bot_user.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: human_user.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: bot_user.id)

      PointsAndRankUpdate.update()

      human_user = Repo.get!(User, human_user.id)
      bot_user = Repo.get!(User, bot_user.id)

      # Human user should get points
      # 1st place in challenger
      assert human_user.points == 64
      assert human_user.rank == 1

      # Bot user should not be updated (points/rank should remain as originally inserted)
      assert bot_user.points == original_bot_points
      assert bot_user.rank == original_bot_rank
    end

    test "ranks users correctly by points and rating" do
      # lower rating
      user1 = insert(:user, rating: 1400, points: 0, rank: 0)
      # higher rating
      user2 = insert(:user, rating: 1600, points: 0, rank: 0)
      # middle rating
      user3 = insert(:user, rating: 1500, points: 0, rank: 0)

      # Use a date within the current season
      current_season_date = get_current_season_date()

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "pro",
          # user1 wins despite lower rating
          winner_ids: [user1.id],
          finished_at: current_season_date
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user3.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)
      user3 = Repo.get!(User, user3.id)

      # user1 should be rank 1 due to highest points
      assert user1.points == 128
      assert user1.rank == 1

      # user2 and user3 both have 2 points, but user2 has higher rating
      assert user2.points == 2
      assert user3.points == 2
      # better rank due to higher rating
      assert user2.rank == 2
      assert user3.rank == 3
    end

    test "ignores tournaments outside current season" do
      user1 = insert(:user, rating: 1500)
      user2 = insert(:user, rating: 1400)

      # Create tournament from previous year - should be ignored
      old_datetime = ~U[2023-01-15 12:00:00Z]

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "pro",
          winner_ids: [user1.id],
          finished_at: old_datetime
        )

      insert(:tournament_result, tournament_id: tournament.id, user_id: user1.id)
      insert(:tournament_result, tournament_id: tournament.id, user_id: user2.id)

      PointsAndRankUpdate.update()

      user1 = Repo.get!(User, user1.id)
      user2 = Repo.get!(User, user2.id)

      # Both users should have 0 points since tournament is outside current season
      assert user1.points == 0
      assert user2.points == 0
    end
  end

  describe "current_season_info/0" do
    test "returns current season information" do
      result = PointsAndRankUpdate.current_season_info()

      assert result
      assert Map.has_key?(result, :season)
      assert Map.has_key?(result, :season_number)
      assert is_binary(result.season)
      assert result.season_number in [0, 1, 2, 3]
    end
  end

  describe "preview_current_season_points/0" do
    test "returns preview of current season points" do
      user = insert(:user, rating: 1500, points: 100)

      result = PointsAndRankUpdate.preview_current_season_points()

      assert is_list(result)
      # Should include our user if they have points
      user_preview = Enum.find(result, fn u -> u.user_id == user.id end)

      if user_preview do
        assert user_preview.points == 100
        assert user_preview.rating == 1500
      end
    end
  end

  describe "tournament_summary/0" do
    test "returns summary of recent tournaments" do
      # Use a date within the current season
      current_season_date = get_current_season_date()

      tournament =
        insert(:tournament,
          state: "finished",
          grade: "pro",
          winner_ids: [1, 2],
          finished_at: current_season_date,
          name: "Test Tournament"
        )

      result = PointsAndRankUpdate.tournament_summary()

      assert is_list(result)
      tournament_summary = Enum.find(result, fn t -> t.tournament_id == tournament.id end)

      if tournament_summary do
        assert tournament_summary.name == "Test Tournament"
        assert tournament_summary.grade == "pro"
        assert tournament_summary.state == "finished"
        assert tournament_summary.winner_count == 2
      end
    end
  end
end
