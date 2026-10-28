defmodule Codebattle.Game.BotDetection.TelemetryQuality do
  @moduledoc "Checks collection capabilities and internal consistency, not whether a player is fair."

  @doc "Summaries use string keys, as stored in editor batches."
  def analyze(summaries, opts \\ []) do
    key_windows =
      summaries |> Enum.filter(&(num(&1, "key_event_count") > 0)) |> Enum.sort_by(&num(&1, "window_start_offset_ms"))

    versions = summaries |> Enum.map(&num(&1, "collector_version")) |> Enum.uniq() |> Enum.sort()
    boundaries_complete = key_windows != [] and Enum.all?(key_windows, &complete_boundaries?/1)
    boundaries = if boundaries_complete, do: boundary_deltas(key_windows), else: []

    issues =
      []
      |> issue(Enum.any?(summaries, &missing_identity?/1), "missing_batch_identity")
      |> issue(sequence_gap?(summaries), "missing_batch_sequence")
      |> issue(
        summaries |> Enum.map(& &1["collector_session"]) |> Enum.reject(&is_nil/1) |> Enum.uniq() |> length() > 1,
        "multiple_collector_sessions"
      )
      |> issue(Enum.any?(versions, &(&1 < 2)), "legacy_collector")
      |> issue(Enum.any?(summaries, &(not consistent_timing?(&1))), "inconsistent_key_timing")
      |> issue(outside_game?(summaries, opts[:duration_ms]), "outside_game_window")
      |> issue(Enum.any?(boundaries, &(&1 < 0)), "overlapping_key_windows")
      |> issue(
        Enum.any?(key_windows, &(num(&1, "collector_version") >= 2 and not complete_boundaries?(&1))),
        "incomplete_key_boundaries"
      )
      |> Enum.reverse()

    timing_reliable = Enum.all?(issues, &(&1 in ["legacy_collector", "incomplete_key_boundaries"]))

    %{
      collector_versions: versions,
      quality_issues: issues,
      timing_reliable: timing_reliable,
      idle_pauses_reliable: timing_reliable and boundaries_complete,
      boundary_deltas: if(timing_reliable and boundaries_complete, do: boundaries, else: [])
    }
  end

  defp missing_identity?(summary) do
    num(summary, "collector_version") >= 3 and
      (not is_binary(summary["collector_session"]) or summary["collector_session"] == "" or
         not is_integer(summary["batch_sequence"]))
  end

  defp sequence_gap?(summaries) do
    summaries
    |> Enum.filter(&is_binary(&1["collector_session"]))
    |> Enum.group_by(& &1["collector_session"])
    |> Enum.any?(fn {_session, windows} ->
      sequences = windows |> Enum.map(&num(&1, "batch_sequence")) |> Enum.sort()

      hd(sequences) != 0 or length(Enum.uniq(sequences)) != length(sequences) or
        List.last(sequences) != length(sequences) - 1
    end)
  end

  defp complete_boundaries?(s) do
    first = s["first_key_offset_ms"]
    last = s["last_key_offset_ms"]

    num(s, "collector_version") >= 2 and is_number(first) and is_number(last) and
      first >= num(s, "window_start_offset_ms") and first <= last and last <= num(s, "window_end_offset_ms") and
      num(s, "key_delta_sample_count") == num(s, "key_event_count") - 1
  end

  defp consistent_timing?(s) do
    keys = num(s, "key_event_count")
    samples = num(s, "key_delta_sample_count")
    min = num(s, "min_key_delta_ms")
    avg = num(s, "avg_key_delta_ms")
    max = num(s, "max_key_delta_ms")
    pauses = num(s, "idle_pause_over_2s_count")

    consistent_samples?(keys, samples) and ordered_intervals?(min, avg, max) and
      consistent_pauses?(pauses, samples, max)
  end

  defp consistent_samples?(keys, samples) do
    samples >= 0 and samples <= max(keys - 1, 0) and (keys <= 1 or samples > 0)
  end

  defp ordered_intervals?(min, avg, max), do: min >= 0 and min <= avg and avg <= max

  defp consistent_pauses?(pauses, samples, max) do
    pauses >= 0 and pauses <= samples and ((max >= 2_000 and pauses > 0) or (max < 2_000 and pauses == 0))
  end

  defp boundary_deltas(windows) do
    windows
    |> Enum.chunk_every(2, 1, :discard)
    |> Enum.map(fn [before, next] -> next["first_key_offset_ms"] - before["last_key_offset_ms"] end)
  end

  defp outside_game?(_summaries, nil), do: false

  defp outside_game?(summaries, duration_ms) do
    Enum.any?(summaries, &(num(&1, "window_end_offset_ms") > duration_ms + 5_000))
  end

  defp issue(issues, true, issue), do: [issue | issues]
  defp issue(issues, false, _issue), do: issues

  defp num(s, key) do
    case s[key] do
      value when is_number(value) -> value
      _ -> 0
    end
  end
end
