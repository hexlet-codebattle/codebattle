defmodule Codebattle.Tournament.ContextTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Round
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.UserGameReport

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

  describe "retry/1" do
    test "clears tournament history and keeps players in the roster" do
      creator = insert(:user, name: "creator", lang: "js")
      player_1 = insert(:user, name: "alice", lang: "js")
      player_2 = insert(:user, name: "bob", lang: "elixir")
      bot = insert(:user, name: "helper-bot", lang: "js", is_bot: true)

      players = %{
        player_1.id =>
          Player.new!(%{
            id: player_1.id,
            name: player_1.name,
            lang: player_1.lang,
            score: 42,
            rating: 1337,
            rank: 11,
            place: 2,
            matches_ids: [1001],
            task_ids: [2001],
            total_duration_sec: 99,
            wins_count: 4,
            last_ranked_round_position: 3,
            state: "finished_round"
          }),
        player_2.id =>
          Player.new!(%{
            id: player_2.id,
            name: player_2.name,
            lang: player_2.lang,
            score: 21,
            rating: 1250,
            rank: 12,
            place: 3,
            matches_ids: [1002],
            task_ids: [2002],
            total_duration_sec: 120,
            wins_count: 2,
            last_ranked_round_position: 3,
            state: "banned"
          }),
        bot.id =>
          Player.new!(%{
            id: bot.id,
            name: bot.name,
            lang: bot.lang,
            is_bot: true,
            score: 77,
            rating: 1800,
            rank: 1,
            place: 1,
            matches_ids: [1003],
            task_ids: [2003],
            total_duration_sec: 12,
            wins_count: 5,
            last_ranked_round_position: 3,
            state: "active"
          })
      }

      tournament =
        insert(:tournament,
          type: "swiss",
          creator_id: creator.id,
          state: "finished",
          players: players,
          players_count: 3,
          matches: %{1 => %{id: 1}},
          cheater_ids: [player_2.id],
          current_round_id: 777,
          current_round_position: 3,
          started_at: DateTime.add(DateTime.utc_now(), -20, :minute),
          finished_at: DateTime.add(DateTime.utc_now(), -5, :minute)
        )

      Repo.insert!(%Round{
        tournament_id: tournament.id,
        state: "active",
        name: "Round 1",
        level: "easy",
        task_provider: "level",
        task_strategy: "random",
        round_timeout_seconds: 120,
        tournament_type: "swiss"
      })

      game = insert(:game, tournament_id: tournament.id, state: "game_over", round_position: 1)

      insert(:tournament_result,
        tournament_id: tournament.id,
        user_id: player_1.id,
        score: 1,
        duration_sec: 10
      )

      Repo.insert!(%TournamentUserResult{
        tournament_id: tournament.id,
        user_id: player_1.id,
        user_name: player_1.name,
        user_lang: player_1.lang,
        score: 1,
        wins_count: 1,
        games_count: 1,
        total_time: 10,
        avg_result_percent: Decimal.new("100.0"),
        inserted_at: NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)
      })

      Repo.insert!(%UserGameReport{
        tournament_id: tournament.id,
        game_id: game.id,
        reporter_id: creator.id,
        offender_id: player_2.id,
        reason: :cheater,
        comment: "suspicious"
      })

      on_exit(fn -> Tournament.GlobalSupervisor.terminate_tournament(tournament.id) end)

      tournament = Tournament.Context.get_from_db!(tournament.id)

      Tournament.Context.retry(tournament)
      Tournament.Context.handle_event(tournament.id, :retry, %{user: creator})

      tournament = Tournament.Context.get!(tournament.id)
      players = Tournament.Helpers.get_players(tournament)

      assert [] == TournamentResult.get_by(tournament.id)
      assert [] == TournamentUserResult.get_by(tournament.id)
      assert [] == UserGameReport.list_by_tournament(tournament.id)

      assert 0 ==
               Repo.aggregate(from(g in Game, where: g.tournament_id == ^tournament.id), :count, :id)

      assert 0 ==
               Repo.aggregate(
                 from(r in Round, where: r.tournament_id == ^tournament.id),
                 :count,
                 :id
               )

      assert tournament.state == "waiting_participants"
      assert tournament.current_round_id == nil
      assert tournament.current_round_position == 0
      assert tournament.started_at == nil
      assert tournament.finished_at == nil
      assert tournament.cheater_ids == []
      assert Tournament.Helpers.players_count(tournament) == 2
      assert Enum.sort(Enum.map(players, & &1.id)) == Enum.sort([player_1.id, player_2.id])

      Enum.each(players, fn player ->
        assert player.state == "active"
        assert player.rating == 1200
        assert player.rank == 5432
        assert player.place == 0
        assert player.score == 0
        assert player.matches_ids == []
        assert player.task_ids == []
        assert player.total_duration_sec == 0
        assert player.wins_count == 0
        assert player.last_ranked_round_position == -1
      end)

      assert DateTime.diff(tournament.starts_at, DateTime.utc_now(), :second) in 240..300
    end
  end
end
