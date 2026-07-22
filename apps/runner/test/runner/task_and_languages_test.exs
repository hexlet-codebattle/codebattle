defmodule Runner.TaskAndLanguagesTest do
  use ExUnit.Case, async: false

  alias Runner.LanguageMeta
  alias Runner.Languages

  setup do
    original_slugs = Application.get_env(:runner, :white_list_lang_slugs)

    on_exit(fn ->
      if is_nil(original_slugs) do
        Application.delete_env(:runner, :white_list_lang_slugs)
      else
        Application.put_env(:runner, :white_list_lang_slugs, original_slugs)
      end
    end)
  end

  test "builds regular tasks from maps and structs" do
    params = %{
      type: "algorithms",
      input_signature: [%{argument_name: "value", type: %{name: "integer"}}],
      output_signature: %{type: %{name: "integer"}},
      asserts: [%{arguments: [1], expected: 2}],
      asserts_examples: []
    }

    assert %Runner.Task{type: "algorithms", comment: "use stdout to debug"} =
             task = Runner.Task.new!(params)

    assert Runner.Task.new!(task) == task
  end

  test "builds experiment tasks with only their required fields" do
    assert %Runner.Task{type: "css", input_signature: []} = Runner.Task.new!(%{type: "css"})
    assert %Runner.Task{type: "sql", input_signature: []} = Runner.Task.new!(%{type: "sql"})
  end

  test "rejects tasks without a type" do
    assert_raise Ecto.InvalidChangesetError, fn ->
      Runner.Task.new!(%{type: nil})
    end
  end

  test "looks up aliases, rejects unknown languages, and calculates timeouts" do
    assert Languages.meta("javascript") == Languages.meta("js")
    assert Languages.get_timeout_ms(Languages.meta("ruby")) == 15_000
    assert_raise RuntimeError, "Unknown language unknown", fn -> Languages.meta("unknown") end
  end

  test "filters language metadata using the configured allowlist" do
    Application.put_env(:runner, :white_list_lang_slugs, ["ruby", "js"])

    assert Enum.sort(Languages.get_lang_slugs()) == ["js", "ruby"]
    assert Languages.get_langs() |> Enum.map(& &1.slug) |> Enum.sort() == ["js", "ruby"]

    Application.put_env(:runner, :white_list_lang_slugs, [])
    assert "ruby" in Languages.get_default_white_list_lang_slugs()
    refute "css" in Languages.get_default_white_list_lang_slugs()
  end

  test "wraps solutions only when a wrapper is configured" do
    assert LanguageMeta.wrap_solution(%LanguageMeta{}, "answer") == "answer"

    meta = %LanguageMeta{solution_wrapper: "before <%= solution %> after"}
    assert LanguageMeta.wrap_solution(meta, "answer") == "before answer after"
  end
end
