defmodule Codebattle.Tournament.Score.WinLossTest do
  use Codebattle.DataCase

  import Codebattle.Tournament.Score.WinLoss

  @test_results [100.0, 80.0, 60.0, 40.0, 20.0, 10.0, 3.0]

  describe "get_score/2" do
    test "elementary level" do
      level = "elementary"

      assert [2, 1, 1, 1, 1, 1, 1] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end

    test "easy level" do
      level = "easy"

      assert [3, 1, 1, 1, 1, 1, 1] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end

    test "medium level" do
      level = "medium"

      assert [5, 1, 1, 1, 1, 1, 1] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end

    test "hard level" do
      level = "hard"

      assert [8, 1, 1, 1, 1, 1, 1] =
               Enum.map(@test_results, fn tests -> get_score(level, tests) end)
    end
  end
end
