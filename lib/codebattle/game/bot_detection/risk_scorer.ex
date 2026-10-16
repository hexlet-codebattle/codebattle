defmodule Codebattle.Game.BotDetection.RiskScorer do
  @moduledoc """
  Pure risk-scoring logic. Given pre-aggregated stats, code analysis and
  the lengths of the final/template solution, returns a score, a level,
  and a list of human-readable signals that contributed to the score.

  Heuristics are organised in three tiers (highest weight first):

    * **Tier 1 — programmatic injection signatures**: chars-inserted-vs-keys
      gap, content-changes-without-keys, multi-char ops with no keys, bulk
      single-event inserts, large/multi-line inserts. These are the
      strongest signals and cover AI extensions (Perplexity, Copilot,
      autotyper userscripts) and pure WebSocket injection bots.

    * **Tier 2 — LLM-style content**: high comment-to-code ratio,
      long pasted-explanation comments, GPT-tell phrases (English + Russian).

    * **Tier 3 — typing rhythm anomalies**: zero idle pauses, no backspace
      across substantial edits, very fast typing, suspiciously uniform
      key-delta timings.

  Self-paste (user copies their own code via Cmd+C / Cmd+V) is respected.
  Newer telemetry counts pasted chars (`paste_tracked`) and keeps them out of
  the injection counters, so those keep their full weight; for older batches,
  a paste shortcut pressed anywhere *significantly* discounts Tier 1 weights.

  Two signals don't come from the code or the keystrokes: time spent away from
  the game (another tab or window) and, from the server's own copy of the
  editor (`EditorHistory`), code that showed up between two editor updates.
  """

  @no_telemetry_solution_min_chars 20
  @injection_min_inserted 8
  @bulk_insert_min 8
  @bulk_insert_large_threshold 50
  @coverage_eval_min_added 60
  @gpt_eval_min_added 60
  @no_backspace_min_chars 150
  @fast_typing_max_avg_ms 30
  @fast_typing_min_keys 30
  @uniform_timing_max_diff_ms 10
  @uniform_timing_min_keys 30
  @idle_pause_min_keys 50
  @idle_pause_min_session_sec 30
  @long_comment_min 3
  @comment_ratio_high 0.6
  @comment_ratio_high_min_lines 4
  @comment_ratio_medium 0.3
  @comment_ratio_medium_min_lines 3
  @away_min_ms 30_000
  @away_long_ms 120_000
  @jump_min_chars 80

  @type input :: %{
          required(:stats) => map() | nil,
          required(:code_analysis) => map() | nil,
          required(:final_length) => non_neg_integer(),
          required(:template_length) => non_neg_integer(),
          optional(:editor_history) => map() | nil
        }

  @type result :: %{
          score: non_neg_integer(),
          level: :none | :low | :medium | :high,
          signals: [String.t()]
        }

  @doc "Compute risk score, level and human-readable signals."
  @spec score(input()) :: result()
  def score(%{stats: stats, code_analysis: code, final_length: fl, template_length: tl} = input) do
    effective = max(0, fl - (tl || 0))
    paste_attempted = paste_attempted?(stats)
    history = Map.get(input, :editor_history)

    contributions =
      []
      |> apply_rule(no_telemetry_with_solution(stats, effective))
      |> apply_rule(programmatic_injection(stats, paste_attempted))
      |> apply_rule(fully_programmatic(stats))
      |> apply_rule(multi_char_with_few_keys(stats, paste_attempted))
      |> apply_rule(bulk_single_insert(stats, paste_attempted))
      |> apply_rule(large_insert(stats, paste_attempted))
      |> apply_rule(multi_line_insert(stats, paste_attempted))
      |> apply_rule(coverage_mismatch(stats, effective))
      |> apply_rule(paste_blocked(stats))
      |> apply_rule(editor_jump(history, stats, paste_attempted))
      |> apply_rule(away_from_game(stats))
      |> apply_rule(zero_idle_pauses(stats))
      |> apply_rule(no_backspace(stats))
      |> apply_rule(fast_typing(stats))
      |> apply_rule(uniform_timing(stats))
      |> apply_rule(comment_ratio_high(code, effective))
      |> apply_rule(comment_ratio_medium(code, effective))
      |> apply_rule(long_comments(code, effective))
      |> apply_rule(gpt_phrases(code, effective))
      |> Enum.reverse()

    score = contributions |> Enum.map(& &1.weight) |> Enum.sum()
    signals = Enum.map(contributions, & &1.signal)

    %{score: score, level: classify(score), signals: signals}
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

  defp no_telemetry_with_solution(nil, effective) when effective > @no_telemetry_solution_min_chars do
    contrib(
      12,
      "No keyboard telemetry recorded but #{effective} chars added on top of the language template — code pushed via WebSocket without typing"
    )
  end

  defp no_telemetry_with_solution(_, _), do: nil

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
      "inserted #{chars} chars but only pressed #{keys} printable key(s) — #{gap_share}% of the content arrived without typing"

    if paste_attempted do
      contrib(
        3,
        base <> " (user did press Cmd+V/Cmd+C — could be self-paste)"
      )
    else
      contrib(
        12,
        base <> " — no paste shortcuts pressed, looks programmatic (AI/extension/autotyper)"
      )
    end
  end

  defp fully_programmatic(nil), do: nil

  defp fully_programmatic(stats) do
    if get(stats, :total_content_changes) > 0 and get(stats, :total_key_events) == 0 do
      contrib(
        8,
        "#{get(stats, :total_content_changes)} content change(s) with zero keypresses — fully programmatic"
      )
    end
  end

  defp multi_char_with_few_keys(nil, _), do: nil
  defp multi_char_with_few_keys(_, true), do: nil

  defp multi_char_with_few_keys(stats, false) do
    multi_inserts = get(stats, :total_multi_char_inserts)
    multi_deletes = get(stats, :total_multi_char_deletes)
    keys = get(stats, :total_key_events)

    if (multi_inserts > 0 or multi_deletes > 0) and keys <= 3 do
      contrib(
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
        contrib(1, "bulk insert of #{max_single} chars in one content-change (paste shortcut used)")

      true ->
        contrib(
          4,
          "bulk insert of #{max_single} chars in one content-change with no paste shortcut"
        )
    end
  end

  defp large_insert(nil, _), do: nil

  defp large_insert(stats, paste_attempted) do
    if get(stats, :total_large_inserts) > 0 do
      n = get(stats, :total_large_inserts)
      weight = if paste_attempted, do: 2 + n, else: 5 + n

      contrib(weight, "#{n} large insert(s) (≥#{@bulk_insert_large_threshold} chars in one event)")
    end
  end

  defp multi_line_insert(nil, _), do: nil

  defp multi_line_insert(stats, paste_attempted) do
    if get(stats, :total_multi_line_inserts) > 0 do
      n = get(stats, :total_multi_line_inserts)
      weight = if paste_attempted, do: 1 + n, else: 3 + n
      contrib(weight, "#{n} multi-line insert(s)")
    end
  end

  defp coverage_mismatch(nil, _), do: nil

  defp coverage_mismatch(stats, effective) when effective >= @coverage_eval_min_added do
    chars = get(stats, :total_chars_inserted)
    ratio = chars / effective
    ratio_pct = round(ratio * 100)

    cond do
      ratio < 0.3 ->
        contrib(
          6,
          "typed #{chars} chars but added #{effective} chars on top of template (#{ratio_pct}% typed)"
        )

      ratio < 0.6 ->
        contrib(3, "typed only #{ratio_pct}% of the added code — possible large paste")

      true ->
        nil
    end
  end

  defp coverage_mismatch(_, _), do: nil

  defp paste_blocked(nil), do: nil

  defp paste_blocked(stats) do
    n = get(stats, :total_paste_blocked)

    if n > 0 do
      contrib(2 + n, "#{n} paste-blocked attempt(s) — tried to paste foreign content")
    end
  end

  # The server got the code in a jump no typing explains: an `editor:data` update (the client
  # sends them at most every 250 ms) added this many non-whitespace chars at once.
  defp editor_jump(nil, _stats, _paste_attempted), do: nil

  defp editor_jump(history, stats, paste_attempted) do
    jump = get(history, :max_jump)

    cond do
      jump < @jump_min_chars ->
        nil

      # Pastes only take the player's own code (the editor's paste guard).
      stats && get(stats, :total_paste_chars) >= jump ->
        contrib(1, "#{jump} chars arrived in one editor update — explained by pasting the player's own code")

      stats && (paste_attempted or get(stats, :total_undo) + get(stats, :total_redo) > 0) ->
        contrib(3, "#{jump} chars arrived in one editor update — maybe an undo or a paste of own code")

      true ->
        contrib(8, "#{jump} chars arrived in one editor update (≤250 ms) with no paste or undo — not typed in the editor")
    end
  end

  # Another tab or window while playing: not proof (docs, a message), but where AI answers are.
  defp away_from_game(nil), do: nil

  defp away_from_game(stats) do
    away = get(stats, :total_away_ms)
    times = get(stats, :total_blurs)
    seconds = round(away / 1000)

    cond do
      away >= @away_long_ms -> contrib(4, "left the game #{times} time(s), #{seconds} s away in total")
      away >= @away_min_ms -> contrib(2, "left the game #{times} time(s), #{seconds} s away in total")
      true -> nil
    end
  end

  # ── Tier 3: typing rhythm anomalies ──────────────────────────────────

  defp zero_idle_pauses(nil), do: nil

  defp zero_idle_pauses(stats) do
    if get(stats, :total_idle_pauses) == 0 and
         get(stats, :elapsed_ms) > @idle_pause_min_session_sec * 1000 and
         get(stats, :total_key_events) > @idle_pause_min_keys do
      contrib(2, "zero idle pauses >2s in a long active session")
    end
  end

  defp no_backspace(nil), do: nil

  # Replacing a selection deletes too, so a human who never presses Backspace still has
  # deleted chars.
  defp no_backspace(stats) do
    if get(stats, :total_backspace) + get(stats, :total_delete) == 0 and
         get(stats, :total_chars_deleted) == 0 and
         typed_chars(stats) > @no_backspace_min_chars do
      contrib(2, "no backspace/delete across a substantial edit")
    end
  end

  defp fast_typing(nil), do: nil

  defp fast_typing(stats) do
    avg = get(stats, :avg_key_delta_ms)
    keys = get(stats, :total_key_events)

    if avg > 0 and avg < @fast_typing_max_avg_ms and keys > @fast_typing_min_keys do
      contrib(3, "very fast typing — avg key delta #{round(avg)} ms")
    end
  end

  defp uniform_timing(nil), do: nil

  defp uniform_timing(stats) do
    avg = get(stats, :avg_key_delta_ms)
    max_d = get(stats, :max_key_delta_ms)
    keys = get(stats, :total_key_events)

    if avg > 0 and max_d > 0 and abs(avg - max_d) < @uniform_timing_max_diff_ms and
         keys > @uniform_timing_min_keys do
      contrib(2, "key timing is suspiciously uniform")
    end
  end

  # ── Tier 2: LLM-style content ────────────────────────────────────────

  defp comment_ratio_high(nil, _), do: nil
  defp comment_ratio_high(_, eff) when eff < @gpt_eval_min_added, do: nil

  defp comment_ratio_high(code, _eff) do
    ratio = get(code, :comment_to_code_ratio)
    lines = get(code, :comment_lines)

    if ratio >= @comment_ratio_high and lines >= @comment_ratio_high_min_lines do
      contrib(
        6,
        "comment-to-code ratio #{format_ratio(ratio)} with #{lines} comment lines — looks like an AI explanation dump"
      )
    end
  end

  defp comment_ratio_medium(nil, _), do: nil
  defp comment_ratio_medium(_, eff) when eff < @gpt_eval_min_added, do: nil

  defp comment_ratio_medium(code, _eff) do
    ratio = get(code, :comment_to_code_ratio)
    lines = get(code, :comment_lines)

    cond do
      ratio >= @comment_ratio_high and lines >= @comment_ratio_high_min_lines ->
        # already handled by comment_ratio_high
        nil

      ratio >= @comment_ratio_medium and lines >= @comment_ratio_medium_min_lines ->
        contrib(3, "high comment ratio #{format_ratio(ratio)} (#{lines} comment lines)")

      true ->
        nil
    end
  end

  defp long_comments(nil, _), do: nil
  defp long_comments(_, eff) when eff < @gpt_eval_min_added, do: nil

  defp long_comments(code, _eff) do
    n = get(code, :long_comment_lines)

    if n >= @long_comment_min do
      contrib(
        2,
        "#{n} long comment line(s) (>40 chars) — typical of pasted LLM explanations"
      )
    end
  end

  defp gpt_phrases(nil, _), do: nil
  defp gpt_phrases(_, eff) when eff < @gpt_eval_min_added, do: nil

  defp gpt_phrases(code, _eff) do
    hits = get(code, :gpt_phrase_hits)

    cond do
      hits >= 2 ->
        contrib(
          4 + hits,
          "#{hits} GPT-style phrase(s) in the code"
        )

      hits == 1 ->
        contrib(3, "1 GPT-style phrase in the code")

      true ->
        nil
    end
  end

  # ── helpers ──────────────────────────────────────────────────────────

  defp contrib(weight, signal), do: %{weight: weight, signal: signal}

  # Inserted chars a keypress of their own should explain: not editor-assisted, not a self-paste.
  defp typed_chars(stats),
    do: max(get(stats, :total_chars_inserted) - get(stats, :total_assisted_chars) - get(stats, :total_paste_chars), 0)

  defp get(map, key) when is_atom(key) do
    case Map.get(map, key) do
      nil -> Map.get(map, Atom.to_string(key), 0)
      v -> v
    end || 0
  end

  defp format_ratio(ratio) when is_number(ratio) do
    :erlang.float_to_binary(ratio * 1.0, decimals: 2)
  end
end
