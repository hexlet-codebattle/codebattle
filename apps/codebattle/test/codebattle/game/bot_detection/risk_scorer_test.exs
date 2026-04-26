defmodule Codebattle.Game.BotDetection.RiskScorerTest do
  @moduledoc """
  Behaviour-driven tests covering one expected outcome per bot type.

  The grouping mirrors the comment-banners in `RiskScorer` itself:

    * Tier 1 — programmatic injection signatures
    * Tier 2 — LLM-style content
    * Tier 3 — typing rhythm anomalies
    * Genuine humans (negative-case tests)
  """
  use ExUnit.Case, async: true

  import Codebattle.BotDetectionFixtures

  alias Codebattle.Game.BotDetection.BatchAggregator
  alias Codebattle.Game.BotDetection.CodeAnalyzer
  alias Codebattle.Game.BotDetection.RiskScorer

  defp aggregate(batches), do: BatchAggregator.aggregate(batches)

  defp score(stats, opts \\ []) do
    RiskScorer.score(%{
      stats: stats,
      code_analysis: Keyword.get(opts, :code, nil),
      final_length: Keyword.get(opts, :final_length, 0),
      template_length: Keyword.get(opts, :template_length, 0)
    })
  end

  defp signal_present?(result, substring) do
    Enum.any?(result.signals, &String.contains?(&1, substring))
  end

  # ──────────────────────────────────────────────────────────────────────
  # Genuine humans — must NOT be flagged
  # ──────────────────────────────────────────────────────────────────────
  describe "human player" do
    test "normal typing across multiple windows scores 0 / level :none" do
      stats = aggregate(human_batches(count: 6, chars_per_batch: 30, keys_per_batch: 30))

      result =
        score(stats,
          code: CodeAnalyzer.analyze(human_style_code()),
          final_length: 200,
          template_length: 170
        )

      assert result.score == 0
      assert result.level == :none
      assert result.signals == []
    end

    test "tiny edit on top of a template (effective length ~ 5) is not flagged" do
      stats = aggregate([batch(%{"chars_inserted" => 5, "printable_key_count" => 5})])

      result = score(stats, final_length: 175, template_length: 170)

      assert result.score == 0
      assert result.level == :none
    end
  end

  # ──────────────────────────────────────────────────────────────────────
  # Tier 1 — programmatic injection
  # ──────────────────────────────────────────────────────────────────────
  describe "WebSocket-only bot (no telemetry batches at all)" do
    test "flagged as :high when no telemetry but solution > template" do
      result = score(nil, final_length: 300, template_length: 170)
      assert result.level == :high
      assert result.score >= 10
      assert signal_present?(result, "No keyboard telemetry recorded")
      assert signal_present?(result, "via WebSocket without typing")
    end

    test "not flagged when no telemetry and no real solution either" do
      result = score(nil, final_length: 170, template_length: 170)
      assert result.score == 0
      assert result.level == :none
    end
  end

  describe "AI extension injection (no paste shortcut)" do
    test "15 chars inserted with 0 printable keys → :high" do
      stats = aggregate([ai_injection_batch()])

      result = score(stats, final_length: 157, template_length: 198)

      assert result.level == :high
      assert result.score >= 12
      assert signal_present?(result, "looks programmatic")
      assert signal_present?(result, "AI/extension/autotyper")
    end
  end

  describe "Self-paste (allowed user clipboard)" do
    test "same chars/keys gap but Cmd+V was pressed → :low" do
      stats = aggregate([self_paste_batch(30)])

      result = score(stats, final_length: 200, template_length: 170)

      assert result.level == :low
      assert result.score <= 5
      assert signal_present?(result, "could be self-paste")
      refute signal_present?(result, "AI/extension/autotyper")
    end
  end

  describe "Pure programmatic edit (zero keypresses)" do
    test "content_changes > 0 with key_events == 0 → :medium or higher" do
      stats = aggregate([fully_programmatic_batch()])

      result = score(stats, final_length: 250, template_length: 170)

      assert result.level in [:medium, :high]
      assert signal_present?(result, "fully programmatic")
    end
  end

  describe "Multi-char ops with few keys (no paste)" do
    test "multi_char_inserts > 0 and key_events ≤ 3 → flagged" do
      stats =
        aggregate([
          batch(%{
            "key_event_count" => 1,
            "printable_key_count" => 0,
            "multi_char_insert_count" => 1,
            "multi_char_delete_count" => 1,
            "max_single_insert_len" => 12,
            "chars_inserted" => 12
          })
        ])

      result = score(stats, final_length: 200, template_length: 170)

      assert signal_present?(result, "multi-char insert")
      assert result.score >= 5
    end

    test "multi-char ops are NOT flagged when paste shortcuts were pressed" do
      stats =
        aggregate([
          batch(%{
            "key_event_count" => 4,
            "printable_key_count" => 0,
            "multi_char_insert_count" => 1,
            "max_single_insert_len" => 30,
            "chars_inserted" => 30,
            "paste_shortcut_attempt_count" => 1,
            "copy_shortcut_count" => 1
          })
        ])

      result = score(stats, final_length: 220, template_length: 170)

      refute signal_present?(result, "multi-char insert(s) and")
    end
  end

  describe "Bulk single-event insert (8–49 chars) without paste" do
    test "max_single_insert == 30 and no paste → bulk-insert signal" do
      stats =
        aggregate([
          batch(%{
            "key_event_count" => 1,
            "printable_key_count" => 1,
            "chars_inserted" => 30,
            "max_single_insert_len" => 30,
            "content_change_count" => 1
          })
        ])

      result = score(stats, final_length: 200, template_length: 170)
      assert signal_present?(result, "bulk insert of 30 chars")
      assert signal_present?(result, "no paste shortcut")
    end

    test "bulk insert is downgraded when paste shortcut was used" do
      stats =
        aggregate([
          batch(%{
            "key_event_count" => 2,
            "printable_key_count" => 0,
            "chars_inserted" => 30,
            "max_single_insert_len" => 30,
            "content_change_count" => 1,
            "paste_shortcut_attempt_count" => 1
          })
        ])

      result = score(stats, final_length: 200, template_length: 170)
      assert signal_present?(result, "paste shortcut used")
    end
  end

  describe "Large insert ≥ 50 chars" do
    test "flagged with higher weight when no paste shortcut" do
      stats =
        aggregate([
          batch(%{
            "chars_inserted" => 100,
            "printable_key_count" => 0,
            "key_event_count" => 1,
            "large_insert_count" => 1,
            "max_single_insert_len" => 100,
            "content_change_count" => 1
          })
        ])

      result = score(stats, final_length: 300, template_length: 170)
      assert signal_present?(result, "large insert(s)")
      assert result.score >= 6
    end
  end

  describe "Multi-line insert" do
    test "flagged when multi_line_insert_count > 0" do
      stats =
        aggregate([
          batch(%{
            "chars_inserted" => 60,
            "printable_key_count" => 0,
            "multi_line_insert_count" => 2,
            "key_event_count" => 1
          })
        ])

      result = score(stats, final_length: 250, template_length: 170)
      assert signal_present?(result, "multi-line insert(s)")
    end
  end

  describe "Coverage mismatch" do
    test "typed << added → flagged when effective added ≥ 60" do
      stats =
        aggregate([
          batch(%{
            "chars_inserted" => 20,
            "printable_key_count" => 20,
            "key_event_count" => 25,
            "max_single_insert_len" => 1,
            "multi_char_insert_count" => 0
          })
        ])

      # Effective = 100 - 20 = 80; typed = 20 → 25% coverage
      result = score(stats, final_length: 100, template_length: 20)
      assert signal_present?(result, "typed 20 chars but added 80 chars")
    end

    test "moderate coverage (30–59%) emits a softer signal" do
      stats =
        aggregate([
          batch(%{
            "chars_inserted" => 40,
            "printable_key_count" => 40,
            "key_event_count" => 45,
            "max_single_insert_len" => 1
          })
        ])

      result = score(stats, final_length: 120, template_length: 20)
      assert signal_present?(result, "possible large paste")
    end

    test "no signal when effective length < 60 (template ≈ final)" do
      stats =
        aggregate([
          batch(%{"chars_inserted" => 5, "printable_key_count" => 5, "key_event_count" => 5})
        ])

      result = score(stats, final_length: 175, template_length: 170)
      refute signal_present?(result, "possible large paste")
      refute signal_present?(result, "typed")
    end
  end

  describe "Paste-blocked attempts" do
    test "any paste_blocked > 0 emits a signal" do
      stats =
        aggregate([
          batch(%{"paste_blocked_count" => 2, "paste_shortcut_attempt_count" => 2})
        ])

      result = score(stats)
      assert signal_present?(result, "paste-blocked")
      assert result.score >= 4
    end
  end

  # ──────────────────────────────────────────────────────────────────────
  # Tier 2 — LLM-style content
  # ──────────────────────────────────────────────────────────────────────
  describe "GPT-style code (English)" do
    test "high comment ratio + many GPT phrases → flagged" do
      code = CodeAnalyzer.analyze(gpt_style_code())
      stats = aggregate(human_batches(count: 4, chars_per_batch: 40, keys_per_batch: 40))

      result = score(stats, code: code, final_length: 800, template_length: 170)

      assert result.score >= 10
      assert signal_present?(result, "GPT-style phrase")
      assert signal_present?(result, "comment")
    end
  end

  describe "GPT-style code (Russian)" do
    test "Russian phrases trigger gpt_phrase signals" do
      code = CodeAnalyzer.analyze(russian_gpt_style_code())
      stats = aggregate(human_batches(count: 4, chars_per_batch: 40, keys_per_batch: 40))

      result = score(stats, code: code, final_length: 800, template_length: 170)

      assert signal_present?(result, "GPT-style phrase")
      assert result.score >= 5
    end
  end

  describe "GPT comments are ignored on tiny edits" do
    test "even a few phrases don't fire when effective length < 60" do
      code = CodeAnalyzer.analyze("// time complexity O(n)\n// this approach\nconst x = 1;")
      stats = aggregate([batch(%{"chars_inserted" => 5, "printable_key_count" => 5})])

      result = score(stats, code: code, final_length: 175, template_length: 170)

      refute signal_present?(result, "GPT-style phrase")
    end
  end

  # ──────────────────────────────────────────────────────────────────────
  # Tier 3 — typing-rhythm anomalies
  # ──────────────────────────────────────────────────────────────────────
  describe "Very fast typing" do
    test "avg key delta < 30ms with > 30 key events → flagged" do
      stats =
        aggregate([
          batch(%{
            "event_count" => 100,
            "key_event_count" => 80,
            "printable_key_count" => 80,
            "chars_inserted" => 80,
            "avg_key_delta_ms" => 15,
            "key_delta_sample_count" => 70,
            "min_key_delta_ms" => 10,
            "max_key_delta_ms" => 25
          })
        ])

      result = score(stats)
      assert signal_present?(result, "very fast typing")
    end
  end

  describe "Uniform key timing" do
    test "avg ≈ max delta with > 30 keys → flagged" do
      stats =
        aggregate([
          batch(%{
            "event_count" => 100,
            "key_event_count" => 80,
            "printable_key_count" => 80,
            "chars_inserted" => 80,
            "avg_key_delta_ms" => 100,
            "max_key_delta_ms" => 105,
            "min_key_delta_ms" => 95,
            "key_delta_sample_count" => 70
          })
        ])

      result = score(stats)
      assert signal_present?(result, "suspiciously uniform")
    end
  end

  describe "Zero idle pauses in long session" do
    test "no pauses with > 50 keys and session > 30s → flagged" do
      stats =
        aggregate([
          batch(%{
            "event_count" => 200,
            "key_event_count" => 200,
            "printable_key_count" => 200,
            "chars_inserted" => 200,
            "idle_pause_over_2s_count" => 0,
            "window_start_offset_ms" => 0,
            "window_end_offset_ms" => 60_000
          })
        ])

      result = score(stats)
      assert signal_present?(result, "zero idle pauses")
    end
  end

  describe "No backspace across substantial edit" do
    test "no backspace/delete with > 80 chars typed → flagged" do
      stats =
        aggregate([
          batch(%{
            "chars_inserted" => 120,
            "key_event_count" => 100,
            "printable_key_count" => 100,
            "backspace_count" => 0,
            "delete_count" => 0
          })
        ])

      result = score(stats)
      assert signal_present?(result, "no backspace/delete")
    end
  end

  # ──────────────────────────────────────────────────────────────────────
  # Score classification
  # ──────────────────────────────────────────────────────────────────────
  describe "classify/level boundaries" do
    test "score 0 → :none" do
      assert score(nil).level == :none
    end

    test "boundary score 10 → :high" do
      stats =
        aggregate([
          batch(%{
            "chars_inserted" => 30,
            "printable_key_count" => 0,
            "key_event_count" => 1,
            "max_single_insert_len" => 30,
            "content_change_count" => 1
          })
        ])

      result = score(stats, final_length: 200, template_length: 170)
      assert result.score >= 10
      assert result.level == :high
    end

    test "single low-tier signal lands in :low band" do
      stats =
        aggregate([
          batch(%{"paste_blocked_count" => 0, "paste_shortcut_attempt_count" => 0}),
          batch(%{
            "chars_inserted" => 7,
            "printable_key_count" => 7,
            "key_event_count" => 8,
            "multi_char_insert_count" => 0
          })
        ])

      result = score(stats)
      assert result.level == :none or result.level == :low
    end
  end
end
