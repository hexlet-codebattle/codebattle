defmodule Codebattle.Tournament.Entire.LadderFlowTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers
  import Ecto.Query

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.PubSub.Message
  alias Codebattle.Repo
  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Server
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.TournamentUserResult

  test "continuous matchmaking: finishing games triggers the next tick, no rematches, finishes" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-flow", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder flow",
        "description" => "ladder flow",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-flow",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "2",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    # Round 0: everyone paired, two games, each on the task's own clock (per_task).
    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 0
    round0 = get_matches(tournament, "playing")
    assert length(round0) == 2
    [%{game_id: gid} | _] = round0
    assert GameContext.get_game!(gid).timeout_seconds == 70

    # The client countdown targets the armed tick: per_task ticks every base_score seconds.
    assert tournament.last_round_started_at
    assert_in_delta DateTime.diff(tournament.next_round_at, DateTime.utc_now()), 300, 2

    # Finish both round-0 games. When the pool empties, the early tick opens round 1
    # and pairs the idle players with fresh (non-rematch) opponents.
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 1
    round1 = get_matches(tournament, "playing")
    assert length(round1) == 2

    # Round 1 is the final wave: the countdown targets the final deadline (game timeout +
    # grace), not another matchmaking tick.
    assert_in_delta DateTime.diff(tournament.next_round_at, DateTime.utc_now()), 72, 2

    # No human pair repeats across the two rounds.
    keys =
      tournament
      |> get_matches()
      |> Enum.map(&Enum.sort(&1.player_ids))

    assert length(keys) == length(Enum.uniq(keys))
    assert MapSet.size(MapSet.new(tournament.played_pair_ids)) == 4

    # Finalization must rebuild every round, not trust a stale intermediate result.
    {updated_count, _rows} =
      TournamentResult
      |> where([tr], tr.tournament_id == ^tournament.id and tr.round_position == 0)
      |> Repo.update_all(set: [score: 999_999])

    assert updated_count > 0

    # Finish round-1 games: ticks are exhausted (rounds_limit == 2) and the pool drains,
    # so the tournament finishes.
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.state == "finished"

    # The finished leaderboard is persisted to tournament_user_results (regression:
    # ladder was missing from TournamentUserResult.upsert_results, so the leaderboard
    # came back empty and sync_players zeroed every player's place/score).
    leaderboard = TournamentUserResult.get_leaderboard(tournament.id)
    assert length(leaderboard) == 4
    assert Enum.map(leaderboard, & &1.place) == [1, 2, 3, 4]
    assert MapSet.new(leaderboard, & &1.user_id) == MapSet.new(users, & &1.id)

    refute Repo.exists?(
             from(tr in TournamentResult,
               where: tr.tournament_id == ^tournament.id and tr.score == 999_999
             )
           )

    # sync_players restores places/scores on the player structs from the leaderboard.
    assert tournament |> get_players() |> Enum.reject(& &1.is_bot) |> Enum.map(& &1.place) |> Enum.sort() ==
             [1, 2, 3, 4]
  end

  test "ticks rebuild only unsettled rounds and rank from all-round totals" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-settled", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder settled rounds",
        "description" => "ladder settled rounds",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-settled",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    # Round 0 drained before the tick, so it is settled; the live scores are the totals.
    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 1
    assert tournament.results_synced_round_position == 0
    assert live_scores(tournament) == db_totals(tournament)
    assert Enum.any?(live_scores(tournament), fn {_id, score} -> score > 0 end)

    # A settled round is not rebuilt by later ticks.
    [%{user_id: tampered_id} | _] = Repo.all(where(TournamentResult, tournament_id: ^tournament.id, round_position: 0))

    Repo.update_all(where(TournamentResult, tournament_id: ^tournament.id, round_position: 0, user_id: ^tampered_id),
      set: [score: 999_999]
    )

    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 2
    assert tournament.results_synced_round_position == 1
    assert live_scores(tournament)[tampered_id] >= 999_999
    assert live_scores(tournament) == db_totals(tournament)
  end

  test "a late join into an active ladder is persisted to the snapshot" do
    tasks = insert_list(2, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-late-join", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    [late | users] = insert_list(3, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder late join",
        "description" => "ladder late join",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-late-join",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})
    Server.handle_event(tournament.id, :join, %{user: late})
    Server.flush_persist(tournament.id)

    persisted = TournamentContext.get_from_db!(tournament.id)
    assert persisted.state == "active"
    assert late.id in Enum.map(Map.values(persisted.players), & &1.id)
  end

  test "draining a wave early inserts a break before the next tick, then opens the next round" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-break", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder break",
        "description" => "ladder break",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-break",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        # Next scheduled tick is far away (300s), so the early empty-pool drain triggers a break.
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 2,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 0

    Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")
    Codebattle.PubSub.subscribe("tournament:#{tournament.id}")

    # Finish both round-0 games: the pool drains while the next tick is 300s away, so instead
    # of an immediate tick the tournament goes on break and does NOT open round 1 yet.
    finish_all_playing_matches(tournament)

    assert_receive %Message{
                     event: "tournament:round_finished",
                     payload: %{
                       tournament: %{
                         break_state: "on",
                         last_round_ended_at: last_round_ended_at,
                         next_round_at: break_over_at
                       }
                     }
                   },
                   1_000

    # During the break the countdown targets the break end, not the far-away tick.
    assert_in_delta DateTime.diff(break_over_at, DateTime.utc_now()), 2, 1

    assert_receive %Message{
                     event: "tournament:updated",
                     payload: %{tournament: %{break_state: "on"}}
                   },
                   1_000

    assert last_round_ended_at

    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "on"
    assert tournament.last_round_ended_at
    assert tournament.current_round_position == 0
    assert get_matches(tournament, "playing") == []

    # Once the break elapses, the tick opens round 1 and clears the break.
    assert_receive %Message{
                     event: "tournament:round_created",
                     payload: %{
                       tournament: %{
                         break_state: "off",
                         current_round_position: 1,
                         last_round_started_at: round1_started_at,
                         next_round_at: next_tick_at
                       }
                     }
                   },
                   3_000

    assert NaiveDateTime.compare(round1_started_at, last_round_ended_at) != :lt
    assert_in_delta DateTime.diff(next_tick_at, DateTime.utc_now()), 300, 2
    Process.sleep(100)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "off"
    assert tournament.current_round_position == 1
    assert length(get_matches(tournament, "playing")) == 2
  end

  test "a single player plays the bot every round, then the tournament finishes" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-solo", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    user = insert(:user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder solo",
        "description" => "ladder solo",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-solo",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: [user]})
    Server.handle_event(tournament.id, :start, %{user: creator})

    play_round = fn tournament, round_position, finish ->
      assert tournament.state == "active"
      assert tournament.current_round_position == round_position
      assert tournament.next_round_at

      # The lone player is paired with the bot every round, even though they already met.
      assert [%{player_ids: player_ids} = match] = get_matches(tournament, "playing")
      assert user.id in player_ids
      [bot_id] = player_ids -- [user.id]
      assert get_player(tournament, bot_id).is_bot
      assert match.round_position == round_position

      finish.(tournament)
      Process.sleep(400)
      {TournamentContext.get(tournament.id), bot_id}
    end

    win = &win_active_match(&1, user)
    timeout = &finish_all_playing_matches/1

    {tournament, bot_id} = play_round.(TournamentContext.get(tournament.id), 0, win)
    {tournament, ^bot_id} = play_round.(tournament, 1, timeout)

    # Round 2 is the final wave: its countdown targets the final deadline (70s + grace).
    assert_in_delta DateTime.diff(tournament.next_round_at, DateTime.utc_now()), 72, 2
    {tournament, ^bot_id} = play_round.(tournament, 2, win)

    assert tournament.state == "finished"
    assert get_matches(tournament, "playing") == []
    assert length(get_matches(tournament)) == 3

    # Only the human is ranked; the bot never shows up in standings.
    assert [%{user_id: user_id, place: 1, score: score}] = TournamentUserResult.get_leaderboard(tournament.id)
    assert user_id == user.id
    assert score > 0
    refute Enum.any?(TournamentUserResult.get_leaderboard(tournament.id), &(&1.user_id == bot_id))
  end

  test "the tournament finishes when its only player leaves instead of ticking forever" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-empty", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    user = insert(:user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder empty",
        "description" => "ladder empty",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-empty",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        # A real break would otherwise be inserted before the next tick.
        "break_duration_seconds" => 30,
        "rounds_limit" => "5",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: [user]})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    assert [_bot_match] = get_matches(tournament, "playing")

    # Leaving ends the bot game; with nobody left to pair, no further round can ever open.
    Server.handle_event(tournament.id, :leave, %{user_id: user.id})
    Process.sleep(500)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.state == "finished"
    assert tournament.break_state == "off"
    assert get_matches(tournament, "playing") == []
  end

  test "a tick with nobody idle still opens an empty round on schedule" do
    # base_score 2 → a matchmaking tick every 2s, while games run on a 70s clock.
    tasks = insert_list(3, :task, level: "easy", base_score: 2, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-busy", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder busy",
        "description" => "ladder busy",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-busy",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    first_tick_at = tournament.next_round_at
    round0_games = get_matches(tournament, "playing")
    assert length(round0_games) == 2
    Codebattle.PubSub.subscribe("tournament:#{tournament.id}:common")

    # Everyone is still playing when the tick fires: round 1 opens anyway, with no games.
    assert_receive %Message{
                     event: "tournament:round_created",
                     payload: %{tournament: %{current_round_position: 1, next_round_at: second_tick_at}}
                   },
                   3_000

    Process.sleep(100)
    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 1
    assert get_matches(tournament, "playing") == round0_games
    assert tournament |> get_matches() |> Enum.filter(&(&1.round_position == 1)) == []

    # The round started at its planned moment, so the schedule does not drift.
    assert DateTime.diff(second_tick_at, first_tick_at, :millisecond) == 2_000
    assert tournament.next_round_at == second_tick_at
  end

  test "a player's games keep the tournament round numbers of the rounds they played" do
    # Ticks every second while the game runs on a 70s clock.
    tasks = insert_list(4, :task, level: "easy", base_score: 1, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-numbers", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    user = insert(:user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder numbers",
        "description" => "ladder numbers",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-numbers",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "4",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: [user]})
    Server.handle_event(tournament.id, :start, %{user: creator})

    # Rounds 2 and 3 open (empty) while the player is still in their round-1 game.
    Process.sleep(2_500)
    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 2

    # Finishing early opens the last round right away, and the player plays it.
    win_active_match(tournament, user)
    Process.sleep(500)
    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 3

    # The player's games are rounds 1 and 4 (positions 0 and 3), not "their 1st and 2nd".
    assert tournament |> get_matches_by_players([user.id]) |> Enum.map(& &1.round_position) |> Enum.sort() ==
             [0, 3]
  end

  test "the round schedule is planned before the start and kept once it begins" do
    [t1, t2, t3] = [
      insert(:task, level: "easy", base_score: 60, time_to_solve_sec: 180),
      insert(:task, level: "easy", base_score: 90, time_to_solve_sec: 200),
      insert(:task, level: "easy", base_score: 120, time_to_solve_sec: 240)
    ]

    insert(:task_pack, name: "ladder-plan", task_ids: [t1.id, t2.id, t3.id])
    creator = insert(:user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder plan",
        "description" => "ladder plan",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-plan",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    # Ticks follow each round's base_score; the last round lasts its game time + grace.
    planned = [60, 90, 242]
    assert TournamentContext.get(tournament.id).round_durations == planned

    Server.handle_event(tournament.id, :join, %{users: insert_list(2, :user)})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    assert tournament.round_durations == planned
    assert_in_delta DateTime.diff(tournament.next_round_at, DateTime.utc_now()), 60, 2
  end

  test "an early drain never inserts a break that would delay the scheduled round" do
    # Ticks every 3s, but a 30s break: a break would push round 1 past its planned start.
    tasks = insert_list(3, :task, level: "easy", base_score: 3, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-cap", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(2, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder cap",
        "description" => "ladder cap",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-cap",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 30,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    planned_round1_at = tournament.next_round_at
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    # No break and no early tick: the players simply wait for the planned round.
    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "off"
    assert tournament.current_round_position == 0

    Process.sleep(max(DateTime.diff(planned_round1_at, DateTime.utc_now(), :millisecond), 0) + 400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.current_round_position == 1
    assert length(get_matches(tournament, "playing")) == 1
  end

  test "the UI start_round event ends the break early and opens the next round" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-force", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder force",
        "description" => "ladder force",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-force",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        # A long break (that still ends before the 300s tick) so the test would never pass by
        # waiting it out — only the forced tick advances.
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 120,
        "rounds_limit" => "3",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    finish_all_playing_matches(tournament)
    Process.sleep(400)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "on"
    assert tournament.current_round_position == 0

    # The admin "Start round" button fires :start_round_force — it should skip the break.
    Server.handle_event(tournament.id, :start_round_force, %{})
    Process.sleep(200)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.break_state == "off"
    assert tournament.current_round_position == 1
    assert length(get_matches(tournament, "playing")) == 2
  end

  test "ladder tick timeout comes from task base_score while game timeout comes from time_to_solve_sec" do
    tasks = insert_list(3, :task, level: "easy", base_score: 90, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-fast", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder fast",
        "description" => "ladder fast",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-fast",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "rounds_limit" => "5",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    [match | _] = get_matches(tournament, "playing")

    assert tournament.current_round_timeout_seconds == 90
    assert GameContext.get_game!(match.game_id).timeout_seconds == 70
  end

  test "fixed-time ladder uses round timeout for games and 3/4 round timeout for ticks" do
    tasks = insert_list(3, :task, level: "easy", base_score: 300, time_to_solve_sec: 70)
    insert(:task_pack, name: "ladder-fixed-time", task_ids: Enum.map(tasks, & &1.id))

    creator = insert(:user)
    users = insert_list(4, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder fixed time",
        "description" => "ladder fixed time",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-fixed-time",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "timeout_mode" => "per_round_fixed",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 80,
        "rounds_limit" => "5",
        "players_limit" => 4
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    [match | _] = get_matches(tournament, "playing")

    assert tournament.timeout_mode == "per_round_fixed"
    assert tournament.current_round_timeout_seconds == 60
    assert GameContext.get_game!(match.game_id).timeout_seconds == 80
  end

  test "the final wave gets one game-time deadline that force-finishes stuck games" do
    task = insert(:task, level: "easy", base_score: 10, time_to_solve_sec: 30)
    insert(:task_pack, name: "ladder-final-deadline", task_ids: [task.id])

    creator = insert(:user)
    users = insert_list(2, :user)

    {:ok, tournament} =
      TournamentContext.create(%{
        "starts_at" => "2026-01-01T12:00",
        "name" => "Ladder final deadline",
        "description" => "Ladder final deadline",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "ladder-final-deadline",
        "creator" => creator,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "ladder",
        "state" => "waiting_participants",
        "round_timeout_seconds" => 300,
        "break_duration_seconds" => 0,
        "rounds_limit" => "1",
        "players_limit" => 2
      })

    Server.handle_event(tournament.id, :join, %{users: users})
    Server.handle_event(tournament.id, :start, %{user: creator})

    tournament = TournamentContext.get(tournament.id)
    assert [%{state: "playing"}] = get_matches(tournament, "playing")

    server_name = {:via, Registry, {Codebattle.Registry, "tournament_srv::#{tournament.id}"}}
    server_pid = GenServer.whereis(server_name)
    server_state = :sys.get_state(server_pid)

    assert server_state.matchmaking_timer_kind == :final_deadline
    assert Process.read_timer(server_state.matchmaking_timer_ref) in 30_000..32_000

    # Fire the already-armed deadline now so the test verifies the force path without
    # sleeping for a full task timeout.
    Process.cancel_timer(server_state.matchmaking_timer_ref)
    send(server_pid, {:ladder_final_deadline, tournament.current_round_position})
    Process.sleep(500)

    tournament = TournamentContext.get(tournament.id)
    assert tournament.state == "finished"
    assert [%{state: "timeout"}] = get_matches(tournament, "timeout")

    server_state = :sys.get_state(server_pid)
    assert server_state.matchmaking_timer_ref == nil
    assert server_state.matchmaking_timer_kind == nil
  end

  defp live_scores(tournament) do
    tournament |> get_players() |> Enum.reject(& &1.is_bot) |> Map.new(&{&1.id, &1.score})
  end

  defp db_totals(tournament) do
    totals = TournamentResult.get_user_totals(tournament)
    tournament |> get_players() |> Enum.reject(& &1.is_bot) |> Map.new(&{&1.id, get_in(totals, [&1.id, :score]) || 0})
  end

  defp finish_all_playing_matches(tournament) do
    tournament
    |> get_matches("playing")
    |> Enum.each(&finish_match(tournament, &1))
  end

  defp finish_match(tournament, match) do
    user = Codebattle.User.get!(hd(match.player_ids))
    win_active_match(tournament, user, %{opponent_percent: 0, duration_sec: 30})
  end
end
