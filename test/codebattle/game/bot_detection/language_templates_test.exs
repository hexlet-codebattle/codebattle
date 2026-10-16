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

    test "returns 0 for a known runtime language without a solution template" do
      assert LanguageTemplates.length_for("css") == 0
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

  describe "length_for/2" do
    test "is the length of the template generated for the task" do
      task = CodebattleWeb.Factory.build(:task)
      template = Codebattle.CodeCheck.generate_solution_template(task, Codebattle.Runner.Languages.meta("python"))

      assert LanguageTemplates.length_for(task, "python") == String.length(template)
    end

    test "falls back to the generic template without a task or for an unknown language" do
      assert LanguageTemplates.length_for(nil, "python") == LanguageTemplates.length_for("python")
      assert LanguageTemplates.length_for(CodebattleWeb.Factory.build(:task), "not_a_lang") == 0
    end
  end
end
