defmodule Codebattle.Game.BotDetection.TelemetryQualityTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.BotDetection.BatchAggregator
  alias Codebattle.Game.BotDetection.RiskScorer

  defp window(overrides \\ %{}) do
    %{
      summary:
        Map.merge(
          %{
            "collector_version" => 2,
            "event_count" => 4,
            "key_event_count" => 2,
            "key_delta_sample_count" => 1,
            "avg_key_delta_ms" => 100,
            "min_key_delta_ms" => 100,
            "max_key_delta_ms" => 100,
            "idle_pause_over_2s_count" => 0,
            "window_start_offset_ms" => 0,
            "window_end_offset_ms" => 100,
            "first_key_offset_ms" => 0,
            "last_key_offset_ms" => 100
          },
          overrides
        )
    }
  end

  defp signals(stats) do
    RiskScorer.score(%{stats: stats, code_analysis: nil, final_length: 0, template_length: 0}).signals
  end

  test "lost windows and collector changes disable rhythm rules" do
    first = window(%{"collector_version" => 3, "collector_session" => "one", "batch_sequence" => 0})

    third =
      window(%{
        "collector_version" => 3,
        "collector_session" => "one",
        "batch_sequence" => 2,
        "window_start_offset_ms" => 200,
        "window_end_offset_ms" => 300,
        "first_key_offset_ms" => 200,
        "last_key_offset_ms" => 300
      })

    stats = BatchAggregator.aggregate([third, first])
    assert "missing_batch_sequence" in stats.quality_issues
    refute stats.timing_reliable
    other = window(%{"collector_version" => 3, "collector_session" => "two", "batch_sequence" => 0})
    assert "multiple_collector_sessions" in BatchAggregator.aggregate([first, other]).quality_issues
    assert "missing_batch_identity" in BatchAggregator.aggregate([window(%{"collector_version" => 3})]).quality_issues
  end

  test "a pause spanning two telemetry windows is retained in timing and idle totals" do
    next =
      window(%{
        "window_start_offset_ms" => 5000,
        "window_end_offset_ms" => 5100,
        "first_key_offset_ms" => 5000,
        "last_key_offset_ms" => 5100
      })

    stats = BatchAggregator.aggregate([window(), next])

    assert stats.timing_reliable
    assert stats.idle_pauses_reliable
    assert stats.total_idle_pauses == 1
    assert stats.max_key_delta_ms == 4900
    assert stats.avg_key_delta_ms == 1700
  end

  test "current complete telemetry can still identify continuous uniform typing" do
    stats =
      BatchAggregator.aggregate([
        window(%{
          "key_event_count" => 80,
          "key_delta_sample_count" => 79,
          "window_end_offset_ms" => 39_500,
          "last_key_offset_ms" => 39_500,
          "min_key_delta_ms" => 500,
          "avg_key_delta_ms" => 500,
          "max_key_delta_ms" => 500
        })
      ])

    assert stats.idle_pauses_reliable
    refute Enum.any?(signals(stats), &String.contains?(&1, "zero idle"))
    assert Enum.any?(signals(stats), &String.contains?(&1, "uniform"))
  end

  test "legacy missing key boundaries cannot establish a continuous session with zero pauses" do
    legacy = window(%{"collector_version" => 0, "window_end_offset_ms" => 60_000})
    stats = BatchAggregator.aggregate([legacy])
    refute stats.idle_pauses_reliable
    assert "legacy_collector" in stats.quality_issues
    refute Enum.any?(signals(stats), &String.contains?(&1, "zero idle"))
  end

  test "a recorded long key interval contradicts zero idle pauses" do
    stats = BatchAggregator.aggregate([window(%{"max_key_delta_ms" => 3000})])
    refute stats.timing_reliable
    refute stats.idle_pauses_reliable
    assert "inconsistent_key_timing" in stats.quality_issues
  end

  test "three-hour offsets in a short game disable timing-based suspicion" do
    stats = BatchAggregator.aggregate([window(%{"window_end_offset_ms" => 10_800_100})], duration_ms: 45_000)
    assert "outside_game_window" in stats.quality_issues
    refute stats.timing_reliable
  end

  test "overlapping keyboard windows are unknown rather than uniform zero-latency typing" do
    stats = BatchAggregator.aggregate([window(), window()])
    assert "overlapping_key_windows" in stats.quality_issues
    refute stats.timing_reliable
  end

  test "invalid min/average/max ordering disables fast and uniform typing rules" do
    stats =
      BatchAggregator.aggregate([
        window(%{"key_event_count" => 80, "avg_key_delta_ms" => 15, "min_key_delta_ms" => 100, "max_key_delta_ms" => 20})
      ])

    refute stats.timing_reliable
    assert signals(stats) == []
  end
end
