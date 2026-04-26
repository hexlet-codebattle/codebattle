defmodule Codebattle.Game.BotDetection.CodeAnalyzerTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.BotDetection.CodeAnalyzer

  describe "analyze/1 — empty inputs" do
    test "returns nil for nil" do
      assert CodeAnalyzer.analyze(nil) == nil
    end

    test "returns nil for empty string" do
      assert CodeAnalyzer.analyze("") == nil
    end

    test "returns nil for non-string input" do
      assert CodeAnalyzer.analyze(123) == nil
      assert CodeAnalyzer.analyze(%{}) == nil
    end
  end

  describe "analyze/1 — pure code, no comments" do
    test "no comments, plain JS" do
      text = """
      const solution = (a, b) => {
        return a + b;
      };

      module.exports = solution;
      """

      result = CodeAnalyzer.analyze(text)

      assert result.comment_lines == 0
      assert result.code_lines >= 3
      assert result.comment_to_code_ratio == 0.0
      assert result.gpt_phrase_hits == 0
      assert result.long_comment_lines == 0
    end
  end

  describe "analyze/1 — comment styles" do
    test "counts JS // line comments" do
      text = """
      // returns the sum
      const solution = (a, b) => {
        // do the addition
        return a + b;
      };
      """

      result = CodeAnalyzer.analyze(text)
      assert result.comment_lines == 2
    end

    test "counts Python # line comments" do
      text = """
      # solve it
      def solution(a, b):
          # add them
          return a + b
      """

      result = CodeAnalyzer.analyze(text)
      assert result.comment_lines == 2
    end

    test "counts Elixir-style # / Haskell -- comments" do
      text = """
      -- single comment
      # another comment
      def foo, do: 1
      """

      result = CodeAnalyzer.analyze(text)
      assert result.comment_lines == 2
    end

    test "counts /* … */ block comments across multiple lines" do
      text = """
      /*
       * Block comment line one
       * Block comment line two
       */
      const x = 1;
      """

      result = CodeAnalyzer.analyze(text)
      assert result.comment_lines == 4
    end

    test "single-line /* … */ counts as one comment line" do
      text = """
      /* short block */
      const x = 1;
      """

      result = CodeAnalyzer.analyze(text)
      assert result.comment_lines == 1
    end
  end

  describe "analyze/1 — long comment lines" do
    test "counts comment lines longer than 40 chars" do
      text = """
      // short
      // this is a much longer comment that goes well past forty characters
      // also long: explaining the algorithm in great detail with many words
      const x = 1;
      """

      result = CodeAnalyzer.analyze(text)
      assert result.long_comment_lines == 2
    end
  end

  describe "analyze/1 — GPT phrases" do
    test "matches single English phrase case-insensitively" do
      text = "// To solve this we use a hashmap\nconst x = 1;"
      result = CodeAnalyzer.analyze(text)
      assert result.gpt_phrase_hits == 1
      assert "to solve this" in result.gpt_phrase_matches
    end

    test "matches multiple distinct English phrases (each counted once)" do
      text = """
      // Time complexity: O(n)
      // Space complexity: O(1)
      // This approach uses a single pass.
      const x = 1;
      """

      result = CodeAnalyzer.analyze(text)
      assert result.gpt_phrase_hits == 3
      assert "time complexity" in result.gpt_phrase_matches
      assert "space complexity" in result.gpt_phrase_matches
      assert "this approach" in result.gpt_phrase_matches
    end

    test "matches Russian phrases" do
      text = """
      # Вот решение задачи
      # Временная сложность O(n)
      def solve(): pass
      """

      result = CodeAnalyzer.analyze(text)
      assert result.gpt_phrase_hits >= 2
      assert "вот решение" in result.gpt_phrase_matches
      assert "временная сложность" in result.gpt_phrase_matches
    end

    test "matches mixed locales" do
      text = """
      // Time complexity: O(n)
      # Вот решение задачи
      const x = 1;
      """

      result = CodeAnalyzer.analyze(text)
      assert result.gpt_phrase_hits == 2
    end

    test "does not split on word boundaries — sub-strings of phrases don't match" do
      # 'this' alone shouldn't match the phrase 'this approach'
      text = "const this_is_fine = 1;"
      result = CodeAnalyzer.analyze(text)
      assert result.gpt_phrase_hits == 0
    end

    test "no false positives on plain solution code" do
      text = """
      const solution = (a, b) => {
        let ans = 0;
        for (let i = 0; i < a; i++) ans += b;
        return ans;
      };
      module.exports = solution;
      """

      result = CodeAnalyzer.analyze(text)
      assert result.gpt_phrase_hits == 0
      assert result.gpt_phrase_matches == []
    end
  end

  describe "analyze/1 — comment-to-code ratio" do
    test "ratio is 0 when no comments" do
      result = CodeAnalyzer.analyze("const x = 1;")
      assert result.comment_to_code_ratio == 0.0
    end

    test "ratio reflects comment_lines / code_lines" do
      text = """
      // c1
      // c2
      // c3
      const a = 1;
      """

      result = CodeAnalyzer.analyze(text)
      assert result.comment_lines == 3
      assert result.code_lines == 1
      assert result.comment_to_code_ratio == 3.0
    end

    test "ratio is 0.0 when only comments and no code (avoids div by zero)" do
      text = """
      // just comments
      // nothing else
      """

      result = CodeAnalyzer.analyze(text)
      assert result.code_lines == 0
      assert result.comment_to_code_ratio == 0.0
    end
  end

  describe "analyze/1 — totals" do
    test "total_chars and total_lines are populated" do
      text = "line1\nline2\nline3"
      result = CodeAnalyzer.analyze(text)
      assert result.total_chars == String.length(text)
      assert result.total_lines == 3
      assert result.non_blank_lines == 3
    end

    test "non_blank_lines excludes empty/whitespace-only lines" do
      text = "line1\n\n   \nline2\n"
      result = CodeAnalyzer.analyze(text)
      assert result.non_blank_lines == 2
    end
  end
end
