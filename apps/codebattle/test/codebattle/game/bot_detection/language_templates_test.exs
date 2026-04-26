defmodule Codebattle.Game.BotDetection.LanguageTemplatesTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.BotDetection.LanguageTemplates

  describe "length_for/1" do
    test "returns 0 for nil" do
      assert LanguageTemplates.length_for(nil) == 0
    end

    test "returns 0 for empty string" do
      assert LanguageTemplates.length_for("") == 0
    end

    test "returns 0 for unknown language" do
      assert LanguageTemplates.length_for("not_a_real_language_lol") == 0
    end

    test "returns 0 for non-string input" do
      assert LanguageTemplates.length_for(123) == 0
      assert LanguageTemplates.length_for(%{}) == 0
    end

    test "returns a positive length for known languages" do
      for slug <- ["js", "ruby", "python", "elixir"] do
        assert LanguageTemplates.length_for(slug) > 0,
               "expected positive template length for #{slug}"
      end
    end
  end
end
