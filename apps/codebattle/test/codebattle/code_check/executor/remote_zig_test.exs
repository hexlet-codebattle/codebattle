defmodule Codebattle.CodeCheck.Executor.RemoteZigTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.CodeCheck.Checker.Token
  alias Codebattle.CodeCheck.Executor.RemoteZig
  alias Runner.Languages

  defp build_token(lang_slug, solution_text) do
    task = build(:task)

    %Token{
      container_output: "",
      container_stderr: "",
      execution_error: nil,
      execution_time_msec: nil,
      executor: RemoteZig,
      exit_code: 0,
      lang_meta: Languages.meta(lang_slug),
      result: nil,
      seed: "seed",
      solution_text: solution_text,
      task: task
    }
  end

  describe "build_params/2" do
    test "wraps java solution with package declaration" do
      token = build_token("java", "public class Solution { public int solution(int a, int b) { return 0; } }")

      params = RemoteZig.build_params(token, "checker_text")

      assert params.lang_slug == "java"
      assert params.checker_text == "checker_text"
      assert String.starts_with?(params.solution_text, "package solution;")
      assert String.contains?(params.solution_text, "public class Solution")
    end

    test "wraps kotlin solution with package declaration" do
      token = build_token("kotlin", "fun solution(a: Int, b: Int): Int { return 0 }")

      params = RemoteZig.build_params(token, nil)

      assert String.starts_with?(params.solution_text, "package solution")
      assert String.contains?(params.solution_text, "fun solution")
    end

    test "wraps golang solution with package main" do
      token = build_token("golang", "func solution(a int, b int) int { return 0 }")

      params = RemoteZig.build_params(token, nil)

      assert String.starts_with?(params.solution_text, "package main")
      assert String.contains?(params.solution_text, "func solution")
    end

    test "wraps js solution with module.exports" do
      token = build_token("js", "const solution = (a, b) => a + b;")

      params = RemoteZig.build_params(token, nil)

      assert String.contains?(params.solution_text, "module.exports = solution;")
      assert String.contains?(params.solution_text, "const solution =")
    end

    test "wraps ts solution with default export" do
      token = build_token("ts", "function solution(a: number, b: number): number { return 0; }")

      params = RemoteZig.build_params(token, nil)

      assert String.contains?(params.solution_text, "export default solution;")
    end

    test "leaves solution unchanged when language has no wrapper" do
      raw = "def solution(a, b)\n  a + b\nend"
      token = build_token("ruby", raw)

      params = RemoteZig.build_params(token, nil)

      assert params.solution_text == raw
    end

    test "encodes asserts as JSON with arguments" do
      token = build_token("ruby", "")

      params = RemoteZig.build_params(token, nil)

      assert {:ok, %{"arguments" => [[1, 1], [2, 1], [3, 2]]}} = Jason.decode(params.asserts)
    end

    test "passes through container_run_timeout from lang_meta" do
      token = build_token("java", "")

      params = RemoteZig.build_params(token, nil)

      assert params.timeout == Languages.meta("java").container_run_timeout
    end
  end
end
