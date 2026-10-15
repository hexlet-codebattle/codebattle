defmodule Codebattle.Game.BotDetection.PhrasesTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.BotDetection.Phrases

  describe "english/0" do
    test "returns a non-empty list" do
      assert is_list(Phrases.english())
      assert match?([_ | _], Phrases.english())
    end

    test "every phrase is lowercase" do
      for phrase <- Phrases.english() do
        assert phrase == String.downcase(phrase),
               "expected lowercase phrase, got: #{inspect(phrase)}"
      end
    end

    test "every phrase is unlikely to collide with identifiers (multi-word OR contains punctuation)" do
      for phrase <- Phrases.english() do
        assert collision_safe?(phrase),
               "phrase looks like a bare identifier and would false-positive: #{inspect(phrase)}"
      end
    end
  end

  describe "russian/0" do
    test "returns a non-empty list" do
      assert is_list(Phrases.russian())
      assert match?([_ | _], Phrases.russian())
    end

    test "every phrase is lowercase (case-insensitive Cyrillic)" do
      for phrase <- Phrases.russian() do
        assert phrase == String.downcase(phrase)
      end
    end

    test "every phrase is unlikely to collide with identifiers" do
      for phrase <- Phrases.russian() do
        assert collision_safe?(phrase),
               "phrase looks like a bare identifier and would false-positive: #{inspect(phrase)}"
      end
    end
  end

  defp collision_safe?(phrase) do
    multi_word? = phrase |> String.split(~r/\s+/, trim: true) |> length() >= 2
    has_punct? = String.match?(phrase, ~r/[[:punct:]]/u)
    multi_word? or has_punct?
  end

  describe "all/0" do
    test "is the union of english and russian" do
      assert Phrases.all() == Phrases.english() ++ Phrases.russian()
    end
  end
end
