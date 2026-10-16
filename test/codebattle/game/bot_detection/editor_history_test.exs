defmodule Codebattle.Game.BotDetection.EditorHistoryTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.BotDetection.EditorHistory

  defp init(id, text, lang \\ "js"), do: %{type: :init, id: id, editor_text: text, editor_lang: lang}
  defp update(id, text, lang \\ "js"), do: %{type: :update_editor_data, id: id, editor_text: text, editor_lang: lang}

  describe "summarize_records/2 — live (raw) records" do
    test "typing adds a few chars per update" do
      records = [
        init(1, "const solution = () => {\n};"),
        update(1, "const solution = () => {\n  re\n};"),
        update(1, "const solution = () => {\n  return 1;\n};")
      ]

      assert %{1 => %{updates: 2, max_jump: 6}} = EditorHistory.summarize_records(records)
    end

    test "a solution dropped in at once is one big jump" do
      solution =
        "const solution = (items, limit) => {\n  const sorted = [...items].sort((a, b) => a - b);\n" <>
          "  return sorted.filter((x) => x <= limit).map((x) => x * 2);\n};"

      records = [init(1, "const solution = () => {\n};"), update(1, solution)]

      assert %{1 => %{max_jump: jump}} = EditorHistory.summarize_records(records)
      assert jump >= 80
    end

    test "a language switch replaces the text without counting as a jump" do
      records = [init(1, "const solution = () => {\n};"), update(1, String.duplicate("x = 1\n", 30), "python")]

      assert %{1 => %{updates: 1, max_jump: 0}} = EditorHistory.summarize_records(records)
    end

    test "players are kept apart" do
      records = [init(1, ""), init(2, ""), update(1, "abc"), update(2, String.duplicate("y", 90))]

      assert %{1 => %{max_jump: 3}, 2 => %{max_jump: 90}} = EditorHistory.summarize_records(records)
    end
  end

  describe "summarize_records/2 — stored (diff) records" do
    test "replays deltas, string keys and all" do
      records = [
        %{"type" => "init", "id" => 1, "editor_text" => "ab", "editor_lang" => "js"},
        %{"type" => "update_editor_data", "id" => 1, "diff" => %{"delta" => [%{"retain" => 1}, %{"insert" => "XYZ"}]}},
        %{"type" => "update_editor_data", "id" => 1, "diff" => %{"delta" => [%{"delete" => 2}], "next_lang" => "python"}}
      ]

      assert %{1 => %{updates: 2, max_jump: 3}} = EditorHistory.summarize_records(records)
    end
  end

  describe "apply_delta/2 and added_chars/2" do
    test "apply_delta handles retain, insert and delete" do
      assert EditorHistory.apply_delta("hello world", [%{retain: 6}, %{delete: 5}, %{insert: "there"}]) == "hello there"
    end

    test "added_chars counts the inserted middle without whitespace" do
      assert EditorHistory.added_chars("ab", "a  x y\nb") == 2
      assert EditorHistory.added_chars("same", "same") == 0
    end

    test "added_chars keeps multi-byte characters whole" do
      assert EditorHistory.added_chars("# привет", "# приветик") == 2
      assert EditorHistory.added_chars("ая", "аюя") == 1
    end
  end
end
