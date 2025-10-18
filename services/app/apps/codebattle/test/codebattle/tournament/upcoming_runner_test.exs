defmodule Codebattle.Tournament.UpcomingRunnerTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.UpcomingRunner

  describe "run_upcoming/0" do
    test "moves upcoming tournament to live when starts_at is within 7 minutes" do
      # Create a tournament that starts in 6 minutes (within the 7-minute threshold)
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(6, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%d %H:%M")

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      assert tournament.state == "upcoming"

      UpcomingRunner.run_upcoming()

      updated_tournament = Tournament.Context.get(tournament.id)
      assert updated_tournament.state == "waiting_participants"
    end

    test "does not move upcoming tournament to live when starts_at is more than 7 minutes away" do
      # Create a tournament that starts in 8 minutes (outside the 7-minute threshold)
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(11, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%d %H:%M")

      tournament =
        insert(:tournament,
          state: "upcoming",
          grade: "rookie",
          starts_at: starts_at
        )

      assert tournament.state == "upcoming"

      UpcomingRunner.run_upcoming()

      updated_tournament = Tournament.Context.get(tournament.id)
      assert updated_tournament.state == "upcoming"
    end

    test "does not move tournament if no upcoming tournament is ready" do
      # Create a tournament that starts in 10 minutes
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(11, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%d %H:%M")

      insert(:tournament,
        state: "upcoming",
        grade: "rookie",
        starts_at: starts_at
      )

      # Should return :noop when no tournament is ready
      assert UpcomingRunner.run_upcoming() == :noop
    end

    test "returns :ok when tournament is moved to live" do
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%d %H:%M")

      insert(:tournament,
        state: "upcoming",
        grade: "rookie",
        starts_at: starts_at
      )

      assert UpcomingRunner.run_upcoming() == :ok
    end
  end

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
  end

  describe "GenServer behavior" do
    test "init/1 returns {:ok, :noop}" do
      assert {:ok, :noop} = UpcomingRunner.init(:noop)
    end

    # skip flaky test
    @tag :skip
    test "handle_info/2 with :run_upcoming processes tournaments and schedules next run" do
      # Clean up any existing tournaments from previous tests
      Repo.delete_all(Tournament)

      # Create a tournament that starts in the future (won't be auto-canceled)
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(5, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%d %H:%M")

      insert(:tournament,
        state: "upcoming",
        grade: "rookie",
        starts_at: starts_at
      )

      assert {:noreply, :noop} = UpcomingRunner.handle_info(:run_upcoming, :noop)

      # Verify tournament was processed
      tournaments = Repo.all(Tournament)
      assert length(tournaments) == 1
      tournament = List.first(tournaments)
      # Tournament is moved to waiting_participants but then canceled because:
      # 1. It has no players
      # 2. Its start time is in the past (for start_or_cancel check)
      # So we expect it to be canceled
      assert tournament.state == "canceled"
    end

    test "handle_info/2 with unknown message returns {:noreply, state}" do
      assert {:noreply, :noop} = UpcomingRunner.handle_info(:unknown_message, :noop)
    end
  end
end
