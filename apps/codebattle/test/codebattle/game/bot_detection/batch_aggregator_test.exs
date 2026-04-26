defmodule Codebattle.Game.BotDetection.BatchAggregatorTest do
  use ExUnit.Case, async: true

  import Codebattle.BotDetectionFixtures

  alias Codebattle.Game.BotDetection.BatchAggregator

  describe "aggregate/1 — empty / invalid" do
    test "returns nil for empty list" do
      assert BatchAggregator.aggregate([]) == nil
    end

    test "returns nil for non-list input" do
      assert BatchAggregator.aggregate(nil) == nil
      assert BatchAggregator.aggregate(%{}) == nil
    end
  end

  describe "aggregate/1 — single batch" do
    test "propagates fields from one batch" do
      stats = BatchAggregator.aggregate([batch()])

      assert stats.batch_count == 1
      assert stats.total_events == 10
      assert stats.total_key_events == 8
      assert stats.total_printable_keys == 7
      assert stats.total_chars_inserted == 7
      assert stats.total_chars_deleted == 1
      assert stats.total_idle_pauses == 1
      assert stats.max_single_insert_len == 1
      assert stats.max_single_delete_len == 1
      assert stats.elapsed_ms == 10_000
      assert stats.events_per_sec == 1.0
    end
  end

  describe "aggregate/1 — multiple batches" do
    setup do
      batches = [
        batch(%{
          "event_count" => 10,
          "key_event_count" => 8,
          "printable_key_count" => 7,
          "chars_inserted" => 7,
          "max_single_insert_len" => 5,
          "window_start_offset_ms" => 0,
          "window_end_offset_ms" => 10_000,
          "avg_key_delta_ms" => 100,
          "key_delta_sample_count" => 5,
          "min_key_delta_ms" => 50,
          "max_key_delta_ms" => 200
        }),
        batch(%{
          "event_count" => 20,
          "key_event_count" => 16,
          "printable_key_count" => 14,
          "chars_inserted" => 14,
          "max_single_insert_len" => 12,
          "window_start_offset_ms" => 10_000,
          "window_end_offset_ms" => 20_000,
          "avg_key_delta_ms" => 200,
          "key_delta_sample_count" => 10,
          "min_key_delta_ms" => 80,
          "max_key_delta_ms" => 400
        })
      ]

      {:ok, batches: batches}
    end

    test "sums event_count and chars across batches", %{batches: batches} do
      stats = BatchAggregator.aggregate(batches)

      assert stats.batch_count == 2
      assert stats.total_events == 30
      assert stats.total_chars_inserted == 21
      assert stats.total_printable_keys == 21
    end

    test "max_single_insert_len takes the max across batches", %{batches: batches} do
      stats = BatchAggregator.aggregate(batches)
      assert stats.max_single_insert_len == 12
    end

    test "min_key_delta_ms takes the global minimum (>0)", %{batches: batches} do
      stats = BatchAggregator.aggregate(batches)
      assert stats.min_key_delta_ms == 50
    end

    test "max_key_delta_ms takes the global maximum", %{batches: batches} do
      stats = BatchAggregator.aggregate(batches)
      assert stats.max_key_delta_ms == 400
    end

    test "avg_key_delta_ms is weighted by sample count", %{batches: batches} do
      stats = BatchAggregator.aggregate(batches)
      # (100 * 5 + 200 * 10) / (5 + 10) = 2500 / 15 = 166.666…
      assert_in_delta stats.avg_key_delta_ms, 166.67, 0.05
    end

    test "elapsed_ms spans first start to last end", %{batches: batches} do
      stats = BatchAggregator.aggregate(batches)
      assert stats.window_start_offset_ms == 0
      assert stats.window_end_offset_ms == 20_000
      assert stats.elapsed_ms == 20_000
    end
  end

  describe "aggregate/1 — accepts both struct-shaped and string-key shapes" do
    test "works with %{summary: %{...}} (atom-keyed top, string-keyed summary)" do
      batches = [%{summary: %{"event_count" => 5, "key_event_count" => 4}}]
      stats = BatchAggregator.aggregate(batches)
      assert stats.total_events == 5
      assert stats.total_key_events == 4
    end

    test "works with %{\"summary\" => %{...}} (fully string-keyed)" do
      batches = [%{"summary" => %{"event_count" => 3}}]
      stats = BatchAggregator.aggregate(batches)
      assert stats.total_events == 3
    end
  end

  describe "aggregate/1 — handles missing summary fields gracefully" do
    test "missing fields default to 0" do
      batches = [%{summary: %{"event_count" => 5}}]
      stats = BatchAggregator.aggregate(batches)

      assert stats.total_events == 5
      assert stats.total_chars_inserted == 0
      assert stats.total_paste_blocked == 0
      assert stats.max_single_insert_len == 0
    end
  end
end
