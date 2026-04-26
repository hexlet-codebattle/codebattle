defmodule Codebattle.Game.BotDetection.CodeAnalyzer do
  @moduledoc """
  Static analysis of a player's final solution text. Produces metrics
  that the `RiskScorer` uses to spot LLM-style answers (lots of comments,
  giveaway phrases, JSDoc-style explanations, etc).

  The analyzer is **language-agnostic** — comment markers used across the
  vast majority of supported languages (`//`, `#`, `/* … */`, `*`, `--`, `%`)
  are detected via prefix matching. That gives reliable comment counts for
  ~95% of the languages in the system without per-language parsing.
  """

  alias Codebattle.Game.BotDetection.Phrases

  @long_comment_threshold 40

  @type t :: %{
          total_chars: non_neg_integer(),
          total_lines: non_neg_integer(),
          non_blank_lines: non_neg_integer(),
          code_lines: non_neg_integer(),
          comment_lines: non_neg_integer(),
          comment_chars: non_neg_integer(),
          comment_to_code_ratio: float(),
          long_comment_lines: non_neg_integer(),
          gpt_phrase_hits: non_neg_integer(),
          gpt_phrase_matches: [String.t()]
        }

  @doc """
  Returns a map of structural metrics for `text`, or `nil` if the text is
  empty / nil.

  All keys use `snake_case` so they round-trip through Ecto JSONB columns.
  """
  @spec analyze(String.t() | nil) :: t() | nil
  def analyze(nil), do: nil
  def analyze(""), do: nil

  def analyze(text) when is_binary(text) do
    lines = String.split(text, "\n")
    total_lines = length(lines)
    non_blank_lines = Enum.count(lines, &(String.trim(&1) != ""))

    {comment_lines, comment_chars} = count_comments(lines)
    code_lines = max(0, non_blank_lines - comment_lines)
    long_comment_lines = count_long_comments(lines)
    {gpt_hits, gpt_matches} = match_gpt_phrases(text)

    %{
      total_chars: String.length(text),
      total_lines: total_lines,
      non_blank_lines: non_blank_lines,
      code_lines: code_lines,
      comment_lines: comment_lines,
      comment_chars: comment_chars,
      comment_to_code_ratio: ratio(comment_lines, code_lines),
      long_comment_lines: long_comment_lines,
      gpt_phrase_hits: gpt_hits,
      gpt_phrase_matches: gpt_matches
    }
  end

  def analyze(_), do: nil

  # ── internals ─────────────────────────────────────────────────────────

  defp count_comments(lines) do
    {cl, cc, _open_block} =
      Enum.reduce(lines, {0, 0, false}, fn line, acc -> classify_line(line, acc) end)

    {cl, cc}
  end

  defp classify_line(line, {cl, cc, in_block}) do
    trimmed = String.trim(line)
    len = String.length(trimmed)

    case classify_comment(trimmed, in_block) do
      {:block_continuation, still_open?} -> {cl + 1, cc + len, still_open?}
      :block_opened -> {cl + 1, cc + len, true}
      :single_line -> {cl + 1, cc + len, false}
      :code -> {cl, cc, false}
    end
  end

  defp classify_comment(trimmed, true = _in_block_continuation) do
    {:block_continuation, !String.contains?(trimmed, "*/")}
  end

  defp classify_comment(trimmed, false) do
    cond do
      String.starts_with?(trimmed, "/*") and not String.contains?(trimmed, "*/") ->
        :block_opened

      single_line_comment?(trimmed) ->
        :single_line

      true ->
        :code
    end
  end

  @comment_prefixes ["//", "#", "/*", "*", "--", "%"]
  defp single_line_comment?(trimmed) do
    Enum.any?(@comment_prefixes, &String.starts_with?(trimmed, &1))
  end

  defp count_long_comments(lines) do
    Enum.count(lines, fn line ->
      trimmed = String.trim(line)

      (String.starts_with?(trimmed, "//") or
         String.starts_with?(trimmed, "#") or
         String.starts_with?(trimmed, "*")) and
        String.length(trimmed) > @long_comment_threshold
    end)
  end

  defp match_gpt_phrases(text) do
    lower = String.downcase(text)

    matches =
      Enum.filter(Phrases.all(), fn phrase ->
        String.contains?(lower, phrase)
      end)

    {length(matches), matches}
  end

  defp ratio(_numerator, 0), do: 0.0

  defp ratio(numerator, denominator) do
    Float.round(numerator / denominator, 3)
  end
end
