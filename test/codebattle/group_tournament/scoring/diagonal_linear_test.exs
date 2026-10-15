defmodule Codebattle.GroupTournament.Scoring.DiagonalLinearTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Scoring.DiagonalLinear

  defp opts(overrides \\ %{}) do
    Map.merge(
      %{slice_count: 125, slice_size: 8, max_score: 1000, place_weight: 1},
      Map.new(overrides)
    )
  end

  describe "anchor values (125x8, max_score=1000)" do
    test "slice 0 / 1st == max_score" do
      assert DiagonalLinear.round_points(0, 1, opts()) == 1000
    end

    test "slice 0 / 8th == slice 7 / 1st (R=7)" do
      assert DiagonalLinear.round_points(0, 8, opts()) == 947
      assert DiagonalLinear.round_points(7, 1, opts()) == 947
    end

    test "slice 50 / 1st = 618" do
      assert DiagonalLinear.round_points(50, 1, opts()) == 618
    end

    test "slice 124 / 8th = 0" do
      assert DiagonalLinear.round_points(124, 8, opts()) == 0
    end
  end

  describe "invariants on 1000-player matrix" do
    test "all positions return non-negative integer" do
      for slice_index <- 0..124, place <- 1..8 do
        v = DiagonalLinear.round_points(slice_index, place, opts())
        assert is_integer(v)
        assert v >= 0
        assert v <= 1000
      end
    end

    test "swap equivalence: all positions with same R earn same points" do
      pts =
        for slice_index <- 0..124, place <- 1..8 do
          {slice_index + (place - 1), DiagonalLinear.round_points(slice_index, place, opts())}
        end

      grouped = Enum.group_by(pts, fn {r, _p} -> r end, fn {_r, p} -> p end)

      for {_r, vs} <- grouped do
        assert length(Enum.uniq(vs)) == 1
      end
    end
  end

  describe "boundary tournaments" do
    test "1x1: single slot earns max_score" do
      assert DiagonalLinear.round_points(0, 1, opts(%{slice_count: 1, slice_size: 1})) == 1000
    end

    test "2x2: hand-verified table" do
      o = opts(%{slice_count: 2, slice_size: 2})
      # R_max = 2
      # slice 0 / 1st: R=0, 1000
      # slice 0 / 2nd: R=1, (2-1)/2 * 1000 = 500
      # slice 1 / 1st: R=1, 500
      # slice 1 / 2nd: R=2, 0
      assert DiagonalLinear.round_points(0, 1, o) == 1000
      assert DiagonalLinear.round_points(0, 2, o) == 500
      assert DiagonalLinear.round_points(1, 1, o) == 500
      assert DiagonalLinear.round_points(1, 2, o) == 0
    end

    test "125x16: 1st of slice 0 = max, bottom = 0" do
      o = opts(%{slice_count: 125, slice_size: 16})
      assert DiagonalLinear.round_points(0, 1, o) == 1000
      assert DiagonalLinear.round_points(124, 16, o) == 0
    end

    test "1000x1: smooth linear across full range" do
      o = opts(%{slice_count: 1000, slice_size: 1})
      # R_max = 999. slice 500 / 1st: R=500, (999-500)/999 * 1000 = 499000/999 = 499.499... → 499
      assert DiagonalLinear.round_points(0, 1, o) == 1000
      assert DiagonalLinear.round_points(999, 1, o) == 0
      assert DiagonalLinear.round_points(500, 1, o) == 499
    end
  end

  describe "defensive inputs" do
    test "place > slice_size clamped" do
      assert DiagonalLinear.round_points(0, 100, opts()) == DiagonalLinear.round_points(0, 8, opts())
    end

    test "place 0 or negative raises" do
      assert_raise ArgumentError, fn -> DiagonalLinear.round_points(0, 0, opts()) end
      assert_raise ArgumentError, fn -> DiagonalLinear.round_points(0, -1, opts()) end
    end

    test "slice_index out of range raises" do
      assert_raise ArgumentError, fn -> DiagonalLinear.round_points(-1, 1, opts()) end
      assert_raise ArgumentError, fn -> DiagonalLinear.round_points(125, 1, opts()) end
    end

    test "max_score = 0 → always 0" do
      assert DiagonalLinear.round_points(0, 1, opts(%{max_score: 0})) == 0
    end
  end

  describe "max_tournament_score/2" do
    test "max_score * rounds" do
      assert DiagonalLinear.max_tournament_score(5, opts()) == 5000
      assert DiagonalLinear.max_tournament_score(0, opts()) == 0
    end
  end
end
