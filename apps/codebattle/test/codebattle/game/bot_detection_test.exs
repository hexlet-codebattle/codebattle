defmodule Codebattle.Game.BotDetectionTest do
  @moduledoc """
  Integration tests for the public BotDetection API. Exercises the full
  pipeline end-to-end against the live database via the test factories.
  """

  use Codebattle.DataCase

  alias Codebattle.Game.BotDetection
  alias Codebattle.Game.BotDetection.Analysis
  alias Codebattle.Game.BotDetection.PlayerReport
  alias Codebattle.Game.BotDetection.Worker
  alias Codebattle.Game.Context
  alias Codebattle.PubSub.Message

  setup do
    user1 = insert(:user)
    user2 = insert(:user)

    {:ok, game} =
      Context.create_game(%{
        state: "playing",
        players: [user1, user2],
        level: "easy"
      })

    {:ok, %{user1: user1, user2: user2, game: game}}
  end

  describe "analyze_game/1" do
    test "returns one Analysis per player even with no telemetry batches", %{game: game} do
      assert {:ok, analyses} = BotDetection.analyze_game(game.id)
      assert length(analyses) == 2

      Enum.each(analyses, fn a ->
        assert %Analysis{} = a
        assert a.game_id == game.id
        assert a.user_id
        assert is_atom(a.level)
        assert is_list(a.signals)
      end)
    end

    test "persists nothing — analyze_game is pure", %{game: game} do
      {:ok, _} = BotDetection.analyze_game(game.id)
      assert BotDetection.list_reports(game.id) == []
    end

    test "returns error for unknown game" do
      assert {:error, :not_found} = BotDetection.analyze_game(999_999_999)
    end

    test "AI-injection batch produces a high-risk analysis", %{user1: user, game: game} do
      summary = %{
        "event_count" => 3,
        "key_event_count" => 1,
        "printable_key_count" => 0,
        "chars_inserted" => 30,
        "chars_deleted" => 5,
        "content_change_count" => 2,
        "multi_char_insert_count" => 1,
        "max_single_insert_len" => 30,
        "window_start_offset_ms" => 0,
        "window_end_offset_ms" => 5000
      }

      assert {:ok, _} = Context.store_editor_summary(game.id, user, summary, "js")

      {:ok, analyses} = BotDetection.analyze_game(game.id)
      a = Enum.find(analyses, &(&1.user_id == user.id))

      assert a.level == :high
      assert a.score >= 10

      assert Enum.any?(
               a.signals,
               &String.contains?(&1, "looks programmatic")
             )
    end
  end

  describe "analyze_and_persist/1 + list_reports/1" do
    test "upserts one row per player", %{game: game, user1: u1, user2: u2} do
      assert {:ok, reports} = BotDetection.analyze_and_persist(game.id)
      assert length(reports) == 2

      assert [stored_u1, stored_u2] =
               game.id
               |> BotDetection.list_reports()
               |> Enum.sort_by(& &1.user_id)

      assert stored_u1.user_id == min(u1.id, u2.id)
      assert stored_u2.user_id == max(u1.id, u2.id)

      Enum.each(reports, fn r ->
        assert %PlayerReport{} = r
        assert r.game_id == game.id
        assert r.level in ["none", "low", "medium", "high"]
      end)
    end

    test "is idempotent — second run upserts in place", %{game: game} do
      assert {:ok, [first, _]} = BotDetection.analyze_and_persist(game.id)
      assert {:ok, [second, _]} = BotDetection.analyze_and_persist(game.id)
      assert first.id == second.id
    end
  end

  describe "get_or_analyze/1" do
    test "first call computes + persists; second call reads from DB", %{game: game} do
      assert BotDetection.list_reports(game.id) == []

      assert {:ok, analyses1} = BotDetection.get_or_analyze(game.id)
      assert length(analyses1) == 2
      assert length(BotDetection.list_reports(game.id)) == 2

      assert {:ok, analyses2} = BotDetection.get_or_analyze(game.id)
      assert length(analyses2) == 2
    end

    test "round-trips report → analysis preserving score and level", %{game: game, user1: u} do
      summary = %{
        "event_count" => 3,
        "key_event_count" => 1,
        "printable_key_count" => 0,
        "chars_inserted" => 30,
        "max_single_insert_len" => 30,
        "multi_char_insert_count" => 1,
        "content_change_count" => 2,
        "window_start_offset_ms" => 0,
        "window_end_offset_ms" => 5000
      }

      {:ok, _} = Context.store_editor_summary(game.id, u, summary, "js")

      {:ok, fresh} = BotDetection.analyze_game(game.id)
      {:ok, _} = BotDetection.analyze_and_persist(game.id)
      {:ok, cached} = BotDetection.get_or_analyze(game.id)

      fresh_for_user = Enum.find(fresh, &(&1.user_id == u.id))
      cached_for_user = Enum.find(cached, &(&1.user_id == u.id))

      assert fresh_for_user.score == cached_for_user.score
      assert fresh_for_user.level == cached_for_user.level
      assert fresh_for_user.signals == cached_for_user.signals
    end
  end

  describe "schedule_analysis/2 + Worker" do
    test "Oban inline mode runs the worker and persists reports", %{game: game} do
      assert BotDetection.list_reports(game.id) == []
      {:ok, _job} = BotDetection.schedule_analysis(game.id)
      # In test config Oban runs inline, so reports are visible immediately.
      assert [_, _] = BotDetection.list_reports(game.id)
    end

    test "worker uses the low-concurrency :bot_detection queue with priority 9" do
      # Worker is configured at compile-time via `use Oban.Worker, queue: ..., priority: ...`.
      # Verify the configured defaults so a refactor that drops them gets caught.
      job = Worker.new(%{game_id: 1})
      assert job.changes.queue == "bot_detection"
      assert job.changes.priority == 9
    end

    test "worker discards (no retry) when game is missing" do
      job = %Oban.Job{args: %{"game_id" => 999_999_999}}
      assert :discard = Worker.perform(job)
    end
  end

  describe "schedule_analysis_after_game/1" do
    test "enqueues the worker for the given game", %{game: game} do
      assert BotDetection.list_reports(game.id) == []
      assert :ok = BotDetection.schedule_analysis_after_game(game.id)
      assert length(BotDetection.list_reports(game.id)) == 2
    end

    test "accepts a game struct (extracts id)", %{game: game} do
      assert :ok = BotDetection.schedule_analysis_after_game(%{id: game.id})
      assert length(BotDetection.list_reports(game.id)) == 2
    end

    test "is fire-and-forget — never raises on bad input" do
      # Bogus id — worker discards. Helper still returns :ok.
      assert :ok = BotDetection.schedule_analysis_after_game(999_999_999)
    end
  end

  describe "tournament alert broadcast" do
    setup do
      # Subscribe BEFORE enqueueing so we don't race the inline-mode worker.
      tournament = insert(:tournament)
      Codebattle.PubSub.subscribe("tournament:#{tournament.id}")
      {:ok, tournament: tournament}
    end

    test "broadcasts tournament:bot_alert when a player is flagged :high in a tournament game",
         %{user1: user, user2: user2, tournament: tournament} do
      {:ok, game} =
        Context.create_game(%{
          state: "playing",
          players: [user, user2],
          level: "easy",
          tournament_id: tournament.id
        })

      # AI-injection summary → :high level for `user`.
      summary = %{
        "event_count" => 3,
        "key_event_count" => 1,
        "printable_key_count" => 0,
        "chars_inserted" => 30,
        "max_single_insert_len" => 30,
        "multi_char_insert_count" => 1,
        "content_change_count" => 2,
        "window_start_offset_ms" => 0,
        "window_end_offset_ms" => 5000
      }

      {:ok, _} = Context.store_editor_summary(game.id, user, summary, "js")

      assert :ok = BotDetection.schedule_analysis_after_game(game.id)

      # Inline Oban runs the worker synchronously, so the broadcast has fired by now.
      assert_received %Message{
        event: "tournament:bot_alert",
        payload: %{tournament_id: t_id, game_id: g_id, reports: reports}
      }

      assert t_id == tournament.id
      assert g_id == game.id
      assert Enum.any?(reports, &(&1.user_id == user.id and &1.level == "high"))
    end

    test "does NOT broadcast when no player is suspicious",
         %{user1: u1, user2: u2, tournament: tournament} do
      {:ok, game} =
        Context.create_game(%{
          state: "playing",
          players: [u1, u2],
          level: "easy",
          tournament_id: tournament.id
        })

      assert :ok = BotDetection.schedule_analysis_after_game(game.id)

      refute_received %Message{event: "tournament:bot_alert"}
    end

    test "does NOT broadcast for non-tournament games", %{game: game, user1: user} do
      summary = %{
        "event_count" => 3,
        "key_event_count" => 1,
        "printable_key_count" => 0,
        "chars_inserted" => 30,
        "max_single_insert_len" => 30,
        "multi_char_insert_count" => 1,
        "content_change_count" => 2,
        "window_start_offset_ms" => 0,
        "window_end_offset_ms" => 5000
      }

      {:ok, _} = Context.store_editor_summary(game.id, user, summary, "js")
      assert :ok = BotDetection.schedule_analysis_after_game(game.id)

      refute_received %Message{event: "tournament:bot_alert"}
    end
  end

  describe "PlayerReport.from_analysis/1" do
    test "produces a map with stringified level" do
      analysis = %Analysis{
        game_id: 1,
        user_id: 2,
        score: 7,
        level: :medium,
        signals: ["a", "b"],
        stats: %{a: 1},
        code_analysis: %{b: 2},
        final_length: 100,
        template_length: 50,
        effective_added_length: 50
      }

      attrs = PlayerReport.from_analysis(analysis)
      assert attrs.level == "medium"
      assert attrs.score == 7
      assert attrs.signals == ["a", "b"]
    end
  end
end
