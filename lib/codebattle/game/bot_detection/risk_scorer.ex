defmodule Codebattle.Game.BotDetection.RiskScorer do
  @moduledoc """
  Review priorities, not bot verdicts or probabilities. Modern collectors supply
  individual edit evidence. Legacy counters are scored per collection window,
  so a paste in another window cannot explain an unrelated insertion.
  Overlapping edit rules use their maximum; rhythm and blocked-paste clues are
  capped below the review threshold. Code style, focus loss, absent pauses,
  missing deletions and incomplete telemetry never contribute suspicion.
  """

  @injection_min_inserted 8
  @bulk_insert_min 8
  @bulk_insert_large_threshold 50
  @fast_typing_max_avg_ms 30
  @fast_typing_min_keys 30
  @uniform_timing_max_diff_ms 10
  @uniform_timing_min_keys 30
  @jump_min_chars 80

  @type input :: %{
          required(:stats) => map() | nil,
          optional(:code_analysis) => map() | nil,
          optional(:final_length) => non_neg_integer(),
          optional(:template_length) => non_neg_integer(),
          optional(:editor_history) => map() | nil,
          optional(:batches) => [map()]
        }

  @type result :: %{
          score: non_neg_integer(),
          level: :none | :low | :medium | :high,
          signals: [String.t()],
          evidence: [map()]
        }

  @doc "Compute risk score, level and human-readable signals."
  @spec score(input()) :: result()
  def score(%{batches: batches} = input) when batches != [] do
    results = Enum.map(batches, &score_batch(&1, input))

    supporting_stats = Map.get(input, :stats)

    supporting =
      []
      |> apply_rule(paste_blocked(supporting_stats))
      |> apply_rule(fast_typing(supporting_stats))
      |> apply_rule(uniform_timing(supporting_stats))

    supporting_result = %{
      score: supporting |> Enum.map(& &1.weight) |> Enum.sum() |> min(4),
      evidence:
        Enum.map(supporting, fn item ->
          %{
            code: item.code,
            category: "rhythm_or_policy",
            weight: item.weight,
            message: item.signal,
            evidence: %{},
            replay_offset_ms: nil
          }
        end)
    }

    evidence = Enum.flat_map(results, & &1.evidence) ++ supporting_result.evidence
    value = Enum.max(Enum.map(results, & &1.score)) + supporting_result.score

    %{
      score: value,
      level: classify(value),
      signals: evidence |> Enum.map(& &1.message) |> Enum.uniq(),
      evidence: evidence
    }
  end

  def score(%{stats: stats} = input) do
    paste_attempted = paste_attempted?(stats)
    history = Map.get(input, :editor_history)

    # These rules describe overlapping aspects of the same edit. Counting all of
    # them independently turns one pasted block into several pieces of evidence.
    edits =
      []
      |> apply_rule(programmatic_injection(stats, paste_attempted))
      |> apply_rule(fully_programmatic(stats))
      |> apply_rule(multi_char_with_few_keys(stats, paste_attempted))
      |> apply_rule(bulk_single_insert(stats, paste_attempted))
      |> apply_rule(large_insert(stats, paste_attempted))
      |> apply_rule(multi_line_insert(stats, paste_attempted))
      |> apply_rule(editor_jump(history, stats, paste_attempted))
      |> Enum.reverse()

    # Rhythm and blocked pastes are supporting clues,
    # not enough on their own to flag a player for moderator review.
    supporting =
      []
      |> apply_rule(paste_blocked(stats))
      |> apply_rule(fast_typing(stats))
      |> apply_rule(uniform_timing(stats))
      |> Enum.reverse()

    edit_score = edits |> Enum.map(& &1.weight) |> Enum.max(fn -> 0 end)
    supporting_score = supporting |> Enum.map(& &1.weight) |> Enum.sum() |> min(4)
    score = edit_score + supporting_score
    contributions = edits ++ supporting
    signals = contributions |> Enum.map(& &1.signal) |> Enum.uniq()

    evidence =
      Enum.map(contributions, fn item ->
        %{
          code: item.code,
          category: if(item in edits, do: "edit", else: "rhythm_or_policy"),
          weight: item.weight,
          message: item.signal,
          evidence: %{},
          replay_offset_ms: nil
        }
      end)

    %{score: score, level: classify(score), signals: signals, evidence: evidence}
  end

  defp score_batch(batch, input) do
    alias Codebattle.Game.BotDetection.BatchAggregator

    summary = batch.summary
    events = Map.get(summary, "edit_evidence", [])

    if Map.get(summary, "collector_version", 0) >= 3 and events != [] do
      evidence =
        events
        |> Enum.filter(fn e ->
          e["inserted_chars"] - e["assisted_chars"] - e["paste_chars"] > max(7, e["printable_keys"] * 2)
        end)
        |> Enum.map(fn e ->
          %{
            code: "unexplained_edit",
            category: "edit",
            weight: 8,
            message: "Bulk edit with no matching editor command or paste; review the replay",
            evidence: e,
            replay_offset_ms: e["offset_ms"]
          }
        end)

      %{score: if(evidence == [], do: 0, else: 8), evidence: evidence}
    else
      result =
        input
        |> Map.delete(:batches)
        |> Map.put(
          :stats,
          [batch]
          |> BatchAggregator.aggregate()
          |> Map.put(:timing_reliable, false)
          |> Map.put(:total_paste_blocked, 0)
        )
        |> Map.put(:editor_history, nil)
        |> score()

      %{
        score: result.score,
        evidence:
          Enum.map(
            result.evidence,
            &Map.merge(&1, %{
              replay_offset_ms: batch.window_start_offset_ms,
              evidence: %{batch_id: batch.id, legacy_window: true}
            })
          )
      }
    end
  end

  # ── orchestration ────────────────────────────────────────────────────

  defp apply_rule(acc, nil), do: acc
  defp apply_rule(acc, %{} = contribution), do: [contribution | acc]

  defp paste_attempted?(nil), do: false

  defp paste_attempted?(stats) when is_map(stats) do
    not paste_tracked?(stats) and
      (get(stats, :total_paste_attempts) > 0 or get(stats, :total_paste_blocked) > 0)
  end

  defp paste_tracked?(stats), do: Map.get(stats, :paste_tracked, Map.get(stats, "paste_tracked")) == true

  defp classify(score) when score >= 10, do: :high
  defp classify(score) when score >= 5, do: :medium
  defp classify(score) when score >= 1, do: :low
  defp classify(_), do: :none

  # ── Tier 1: programmatic injection ────────────────────────────────────

  defp programmatic_injection(nil, _), do: nil

  # Editor-assisted chars (auto-indent, closing brackets, completions) arrive without their own
  # keypress but are not injected.
  defp programmatic_injection(stats, paste_attempted) do
    chars = typed_chars(stats)
    keys = get(stats, :total_printable_keys)

    cond do
      chars < @injection_min_inserted -> nil
      keys * 2 >= chars -> nil
      true -> build_injection_signal(chars, keys, paste_attempted)
    end
  end

  defp build_injection_signal(chars, keys, paste_attempted) do
    gap_share = round((chars - keys) / max(1, chars) * 100)

    base =
      "inserted #{chars} chars but only pressed #{keys} printable key(s) — #{gap_share}% of the content is not matched to recorded keys"

    if paste_attempted do
      contrib(
        "unexplained_insertions",
        3,
        base <> " (user did press Cmd+V/Cmd+C — could be self-paste)"
      )
    else
      contrib(
        "unexplained_insertions",
        12,
        base <> " — unexplained edit window; review the replay and input method"
      )
    end
  end

  defp fully_programmatic(nil), do: nil

  defp fully_programmatic(stats) do
    if typed_chars(stats) >= @injection_min_inserted and get(stats, :total_key_events) == 0 do
      contrib(
        "edits_without_keys",
        8,
        "#{get(stats, :total_content_changes)} content change(s) with zero recorded keypresses — origin is unknown"
      )
    end
  end

  defp multi_char_with_few_keys(nil, _), do: nil
  defp multi_char_with_few_keys(_, true), do: nil

  defp multi_char_with_few_keys(stats, false) do
    multi_inserts = get(stats, :total_multi_char_inserts)
    multi_deletes = get(stats, :total_multi_char_deletes)
    keys = get(stats, :total_key_events)

    if multi_inserts > 0 and keys <= 3 do
      contrib(
        "multi_character_edit",
        5,
        "#{multi_inserts} multi-char insert(s) and #{multi_deletes} multi-char delete(s) with only #{keys} keypress(es)"
      )
    end
  end

  defp bulk_single_insert(nil, _), do: nil

  defp bulk_single_insert(stats, paste_attempted) do
    max_single = get(stats, :max_single_insert_len)

    cond do
      max_single < @bulk_insert_min ->
        nil

      max_single >= @bulk_insert_large_threshold ->
        # handled by `large_insert/2` to avoid double-counting
        nil

      paste_attempted ->
        contrib("bulk_insert", 1, "bulk insert of #{max_single} chars in one content-change (paste shortcut used)")

      true ->
        contrib(
          "bulk_insert",
          4,
          "bulk insert of #{max_single} chars in one content-change with no paste shortcut"
        )
    end
  end

  defp large_insert(nil, _), do: nil

  defp large_insert(stats, paste_attempted) do
    if get(stats, :total_large_inserts) > 0 do
      n = get(stats, :total_large_inserts)
      weight = if paste_attempted, do: min(2 + n, 4), else: min(5 + n, 8)

      contrib("large_insert", weight, "#{n} large insert(s) (≥#{@bulk_insert_large_threshold} chars in one event)")
    end
  end

  defp multi_line_insert(nil, _), do: nil

  defp multi_line_insert(stats, paste_attempted) do
    if get(stats, :total_multi_line_inserts) > 0 do
      n = get(stats, :total_multi_line_inserts)
      weight = if paste_attempted, do: min(1 + n, 3), else: min(3 + n, 6)
      contrib("multiline_insert", weight, "#{n} multi-line insert(s)")
    end
  end

  defp paste_blocked(nil), do: nil

  defp paste_blocked(stats) do
    n = get(stats, :total_paste_blocked)

    if n > 0 do
      contrib("blocked_paste", 2 + n, "#{n} paste-blocked attempt(s) — tried to paste foreign content")
    end
  end

  # A large editor update is a review clue; the 250 ms client throttle does not
  # guarantee delivery intervals (network gaps and reconnects can coalesce edits).
  defp editor_jump(nil, _stats, _paste_attempted), do: nil

  defp editor_jump(history, _stats, _paste_attempted) do
    jump = get(history, :max_jump)

    if jump < @jump_min_chars do
      nil
    else
      contrib(
        "server_editor_jump",
        8,
        "#{jump} chars arrived in one editor update — review the replay and connection gaps; origin is unknown"
      )
    end
  end

  # ── Tier 3: typing rhythm anomalies ──────────────────────────────────

  defp fast_typing(nil), do: nil

  defp fast_typing(stats) do
    avg = get(stats, :avg_key_delta_ms)
    keys = get(stats, :total_key_events)

    if timing_reliable?(stats) and avg > 0 and avg < @fast_typing_max_avg_ms and keys > @fast_typing_min_keys do
      contrib("fast_typing", 3, "very fast typing — avg key delta #{round(avg)} ms")
    end
  end

  defp uniform_timing(nil), do: nil

  defp uniform_timing(stats) do
    avg = get(stats, :avg_key_delta_ms)
    max_d = get(stats, :max_key_delta_ms)
    keys = get(stats, :total_key_events)

    if timing_reliable?(stats) and avg > 0 and max_d > 0 and abs(avg - max_d) < @uniform_timing_max_diff_ms and
         keys > @uniform_timing_min_keys do
      contrib("uniform_timing", 2, "key timing is suspiciously uniform")
    end
  end

  # ── helpers ──────────────────────────────────────────────────────────

  defp contrib(code, weight, signal), do: %{code: code, weight: weight, signal: signal}
  defp timing_reliable?(stats), do: get(stats, :timing_reliable) == true

  # Inserted chars a keypress of their own should explain: not editor-assisted, not a self-paste.
  defp typed_chars(stats),
    do: max(get(stats, :total_chars_inserted) - get(stats, :total_assisted_chars) - get(stats, :total_paste_chars), 0)

  defp get(map, key) when is_atom(key) do
    case Map.get(map, key) do
      nil -> Map.get(map, Atom.to_string(key), 0)
      v -> v
    end || 0
  end
end
