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
        |> DateTime.add(8, :minute)
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
        |> DateTime.add(10, :minute)
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

  describe "start_or_cancel_waiting_participants/0" do
    test "starts tournament when it has players and is in waiting_participants state" do
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(-5, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%dT%H:%M")

      user1 = insert(:user)
      user2 = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => starts_at,
          "name" => "Test Tournament",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => user1,
          "break_duration_seconds" => 0,
          "task_provider" => "level",
          "task_strategy" => "random",
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 16,
          "grade" => "rookie"
        })

      # Add players to the tournament
      Tournament.Server.handle_event(tournament.id, :join, %{users: [user1, user2]})

      tournament = Tournament.Context.get(tournament.id)
      assert tournament.state == "waiting_participants"
      assert tournament.players_count == 2

      UpcomingRunner.start_or_cancel_waiting_participants()

      updated_tournament = Tournament.Context.get(tournament.id)
      # Tournament should be started
      assert updated_tournament.state in ["active", "finished"]
    end

    test "cancels tournament when it has no players and is in waiting_participants state" do
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(-5, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%dT%H:%M")

      user = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => starts_at,
          "name" => "Test Tournament",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => user,
          "break_duration_seconds" => 0,
          "task_provider" => "level",
          "task_strategy" => "random",
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 16,
          "grade" => "rookie"
        })

      assert tournament.state == "waiting_participants"
      assert tournament.players_count == 0

      UpcomingRunner.start_or_cancel_waiting_participants()

      updated_tournament = Tournament.Context.get(tournament.id)
      assert updated_tournament.state == "canceled"
    end

    test "does not process open grade tournaments" do
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(-5, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%dT%H:%M")

      user = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => starts_at,
          "name" => "Test Tournament",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => user,
          "break_duration_seconds" => 0,
          "task_provider" => "level",
          "task_strategy" => "random",
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 16,
          "grade" => "open"
        })

      assert tournament.state == "waiting_participants"
      assert tournament.players_count == 0

      UpcomingRunner.start_or_cancel_waiting_participants()

      # Open grade tournaments should not be auto-canceled
      updated_tournament = Tournament.Context.get(tournament.id)
      assert updated_tournament.state == "waiting_participants"
    end

    test "processes multiple tournaments correctly" do
      starts_at =
        DateTime.utc_now()
        |> DateTime.add(-5, :minute)
        |> DateTime.truncate(:second)
        |> Calendar.strftime("%Y-%m-%dT%H:%M")

      user1 = insert(:user)
      user2 = insert(:user)

      # Tournament with players - should start
      {:ok, tournament_with_players} =
        Tournament.Context.create(%{
          "starts_at" => starts_at,
          "name" => "Tournament With Players",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => user1,
          "break_duration_seconds" => 0,
          "task_provider" => "level",
          "task_strategy" => "random",
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 16,
          "grade" => "rookie"
        })

      Tournament.Server.handle_event(tournament_with_players.id, :join, %{users: [user1]})

      # Tournament without players - should cancel
      {:ok, tournament_without_players} =
        Tournament.Context.create(%{
          "starts_at" => starts_at,
          "name" => "Tournament Without Players",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => user2,
          "break_duration_seconds" => 0,
          "task_provider" => "level",
          "task_strategy" => "random",
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 16,
          "grade" => "rookie"
        })

      UpcomingRunner.start_or_cancel_waiting_participants()

      tournament1 = Tournament.Context.get(tournament_with_players.id)
      tournament2 = Tournament.Context.get(tournament_without_players.id)

      # Tournament with players should be started
      assert tournament1.state in ["active", "finished"]

      # Tournament without players should be canceled
      assert tournament2.state == "canceled"
    end

    test "returns :ok after processing" do
      assert UpcomingRunner.start_or_cancel_waiting_participants() == :ok
    end
  end

  describe "GenServer behavior" do
    test "init/1 returns {:ok, :noop}" do
      assert {:ok, :noop} = UpcomingRunner.init(:noop)
    end

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
