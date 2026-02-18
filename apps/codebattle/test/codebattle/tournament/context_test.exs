defmodule Codebattle.Tournament.ContextTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament

  describe "get_upcoming_to_live_candidate/1" do
    test "returns tournament that starts within the delay window" do
      # Tournament starting in 5 minutes (within 7 minute window)
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result.id == tournament.id
    end

    test "returns tournament that starts exactly at the delay time" do
      # Tournament starting exactly in 7 minutes
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(7, :minute)
        |> DateTime.truncate(:second)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result.id == tournament.id
    end

    test "returns tournament that starts right now" do
      # Tournament starting right now (edge case)
      starts_at = DateTime.truncate(DateTime.utc_now(), :second)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result.id == tournament.id
    end

    test "returns tournament that starts 1 second from now" do
      # Tournament starting in 1 second (edge case)
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(1, :second)
        |> DateTime.truncate(:second)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result.id == tournament.id
    end

    test "returns nil when tournament starts beyond the delay window" do
      # Tournament starting in 10 minutes (beyond 7 minute window)
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(10, :minute)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "upcoming",
        grade: "rookie",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "returns nil when tournament starts 1 second beyond delay window" do
      # Tournament starting 1 second after the delay window
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(7, :minute)
        |> DateTime.add(1, :second)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "upcoming",
        grade: "rookie",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "returns nil when tournament already started (in the past)" do
      # Tournament that should have started 1 minute ago
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(-1, :minute)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "upcoming",
        grade: "rookie",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "returns nil when tournament started 1 second ago" do
      # Tournament that started 1 second ago
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(-1, :second)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "upcoming",
        grade: "rookie",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "ignores open grade tournaments" do
      # Tournament with open grade should be ignored
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "upcoming",
        grade: "open",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "ignores non-upcoming tournaments" do
      # Tournament in waiting_participants state should be ignored
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "waiting_participants",
        grade: "rookie",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "ignores active tournaments" do
      # Tournament in active state should be ignored
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "active",
        grade: "rookie",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "ignores finished tournaments" do
      # Tournament in finished state should be ignored
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "finished",
        grade: "rookie",
        starts_at: starts_at
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "returns the tournament with lowest id when multiple match" do
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)

      tournament1 =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      tournament2 =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      # Should return the one with lower id
      assert result.id == min(tournament1.id, tournament2.id)
    end

    test "works with different delay windows" do
      # Test with 5 minute delay
      starts_at_4_mins =
        DateTime.utc_now()
        |> DateTime.add(4, :minute)
        |> DateTime.truncate(:second)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at_4_mins
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(5)
      assert result.id == tournament.id

      # Tournament at 6 minutes should not be returned with 5 minute delay
      starts_at_6_mins =
        DateTime.utc_now()
        |> DateTime.add(6, :minute)
        |> DateTime.truncate(:second)

      insert(:tournament,
        state: "upcoming",
        grade: "elementary",
        starts_at: starts_at_6_mins
      )

      result = Tournament.Context.get_upcoming_to_live_candidate(5)
      # Should still return the first tournament
      assert result.id == tournament.id
    end

    test "handles different tournament grades" do
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(3, :minute)
        |> DateTime.truncate(:second)

      # Test with different grades (all should work except "open")
      for grade <- ["rookie", "elementary", "easy", "medium", "hard"] do
        tournament =
          insert(:tournament,
            state: "upcoming",
            grade: grade,
            starts_at: starts_at
          )

        result = Tournament.Context.get_upcoming_to_live_candidate(7)
        assert result.id == tournament.id

        # Clean up for next iteration
        Repo.delete(tournament)
      end
    end

    test "returns nil when no tournaments exist" do
      result = Tournament.Context.get_upcoming_to_live_candidate(7)
      assert result == nil
    end

    test "handles zero delay window" do
      # Tournament starting right now
      starts_at = DateTime.truncate(DateTime.utc_now(), :second)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(0)
      assert result.id == tournament.id
    end

    test "handles large delay window" do
      # Tournament starting in 100 minutes
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(100, :minute)
        |> DateTime.truncate(:second)

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      result = Tournament.Context.get_upcoming_to_live_candidate(120)
      assert result.id == tournament.id

      # Should not be returned with smaller window
      result = Tournament.Context.get_upcoming_to_live_candidate(90)
      assert result == nil
    end
  end
end
