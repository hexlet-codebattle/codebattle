defmodule Codebattle.Game.BotDetection.BatchAggregator do
  @moduledoc """
  Folds a list of `EditorEventBatch` records (or plain maps with the same
  shape) into a single aggregated stats map per player.

  Accepts both Ecto structs and plain maps so it can be used in tests with
  hand-built fixtures.

  All keys in the returned map use `snake_case` so the result round-trips
  through Ecto JSONB storage and JSON encoding.
  """

  @type batch :: map()
  @type stats :: map()

  @doc "Returns the aggregated stats map, or `nil` for an empty batch list."
  @spec aggregate([batch()]) :: stats() | nil
  def aggregate([]), do: nil

  def aggregate(batches) when is_list(batches) do
    {weighted_avg_numer, weighted_avg_denom, min_key_delta_acc, max_key_delta_acc} =
      Enum.reduce(batches, {0, 0, nil, 0}, fn batch, {wa_n, wa_d, min_d, max_d} ->
        s = summary(batch)
        samples = num(s, "key_delta_sample_count")
        avg = num(s, "avg_key_delta_ms")
        min_b = num(s, "min_key_delta_ms")
        max_b = num(s, "max_key_delta_ms")

        next_min =
          cond do
            min_b > 0 and is_nil(min_d) -> min_b
            min_b > 0 -> min(min_d, min_b)
            true -> min_d
          end

        {wa_n + avg * samples, wa_d + samples, next_min, max(max_d, max_b)}
      end)

    avg_key_delta_ms = if weighted_avg_denom > 0, do: weighted_avg_numer / weighted_avg_denom, else: 0.0
    min_key_delta_ms = min_key_delta_acc || 0
    max_key_delta_ms = max_key_delta_acc

    first_start = batches |> Enum.map(&(&1 |> summary() |> num("window_start_offset_ms"))) |> Enum.min()
    last_end = batches |> Enum.map(&(&1 |> summary() |> num("window_end_offset_ms"))) |> Enum.max()
    elapsed_ms = max(last_end - first_start, 0)
    elapsed_sec = max(elapsed_ms / 1000, 1)
    total_events = sum(batches, "event_count")
    total_chars_inserted = sum(batches, "chars_inserted")
    final_text_length = batches |> List.last() |> summary() |> num("final_text_length")

    %{
      batch_count: length(batches),
      total_events: total_events,
      total_key_events: sum(batches, "key_event_count"),
      total_printable_keys: sum(batches, "printable_key_count"),
      total_chars_inserted: total_chars_inserted,
      total_chars_deleted: sum(batches, "chars_deleted"),
      total_net_text_delta: sum(batches, "net_text_delta"),
      total_content_changes: sum(batches, "content_change_count"),
      total_large_inserts: sum(batches, "large_insert_count"),
      total_multi_char_inserts: sum(batches, "multi_char_insert_count"),
      total_multi_char_deletes: sum(batches, "multi_char_delete_count"),
      total_multi_line_inserts: sum(batches, "multi_line_insert_count"),
      total_paste_blocked: sum(batches, "paste_blocked_count"),
      total_paste_attempts: sum(batches, "paste_shortcut_attempt_count"),
      total_copy_shortcuts: sum(batches, "copy_shortcut_count"),
      total_cut_shortcuts: sum(batches, "cut_shortcut_count"),
      total_idle_pauses: sum(batches, "idle_pause_over_2s_count"),
      total_backspace: sum(batches, "backspace_count"),
      total_delete: sum(batches, "delete_count"),
      total_arrows: sum(batches, "arrow_key_count"),
      total_undo: sum(batches, "undo_shortcut_count"),
      total_redo: sum(batches, "redo_shortcut_count"),
      avg_key_delta_ms: Float.round(avg_key_delta_ms * 1.0, 2),
      min_key_delta_ms: min_key_delta_ms,
      max_key_delta_ms: max_key_delta_ms,
      max_single_insert_len: max_field(batches, "max_single_insert_len"),
      max_single_delete_len: max_field(batches, "max_single_delete_len"),
      window_start_offset_ms: first_start,
      window_end_offset_ms: last_end,
      elapsed_ms: elapsed_ms,
      events_per_sec: Float.round(total_events / elapsed_sec, 3),
      chars_per_sec: Float.round(total_chars_inserted / elapsed_sec, 3),
      final_text_length: final_text_length
    }
  end

  def aggregate(_), do: nil

  # ── internals ─────────────────────────────────────────────────────────

  # `summary/1` works for both Ecto structs (atom keys: `summary:`) and
  # raw maps (string keys: `"summary"`).
  defp summary(%{summary: s}) when is_map(s), do: s
  defp summary(%{"summary" => s}) when is_map(s), do: s
  defp summary(_), do: %{}

  defp num(map, key) when is_map(map) do
    case Map.get(map, key) do
      nil -> 0
      v when is_number(v) -> v
      _ -> 0
    end
  end

  defp sum(batches, field) do
    Enum.reduce(batches, 0, fn b, acc -> acc + num(summary(b), field) end)
  end

  defp max_field(batches, field) do
    Enum.reduce(batches, 0, fn b, acc -> max(acc, num(summary(b), field)) end)
  end
end
