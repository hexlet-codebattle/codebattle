defmodule Codebattle.Tournament.Score.OneZeroTest do
  use Codebattle.DataCase

  import Codebattle.Tournament.Score.OneZero

  @test_results [100.0, 80.0, 60.0, 40.0, 20.0, 10.0, 3.0]

  describe "get_score/2" do
    test "elementary level" do
      level = "elementary"

      assert [1, 0, 0, 0, 0, 0, 0] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end

    test "easy level" do
      level = "easy"

      assert [1, 0, 0, 0, 0, 0, 0] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end

    test "medium level" do
      level = "medium"

      assert [1, 0, 0, 0, 0, 0, 0] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end

    test "hard level" do
      level = "hard"

      assert [1, 0, 0, 0, 0, 0, 0] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end
  end
end
