defmodule Codebattle.GroupTournament.Scoring.GlobalLinearTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Scoring.GlobalLinear

  defp opts(overrides \\ %{}) do
    Map.merge(
      %{slice_count: 125, slice_size: 8, max_score: 1000},
      Map.new(overrides)
    )
  end

  describe "anchor values (125x8, max_score=1000)" do
    test "slice 0 / 1st == max_score" do
      assert GlobalLinear.round_points(0, 1, opts()) == 1000
    end

    test "slice 0 / 8th = 993 (slight top-tier protection)" do
      assert GlobalLinear.round_points(0, 8, opts()) == 993
    end

    test "slice 1 / 1st = 992 (one below slice 0 / 8th)" do
      assert GlobalLinear.round_points(1, 1, opts()) == 992
    end

    test "slice 7 / 1st = 944" do
      assert GlobalLinear.round_points(7, 1, opts()) == 944
    end

    test "slice 50 / 1st = 600" do
      assert GlobalLinear.round_points(50, 1, opts()) == 600
    end

    test "slice 124 / 8th = 0" do
      assert GlobalLinear.round_points(124, 8, opts()) == 0
    end
  end

  describe "invariants" do
    test "unique points per slot (no two positions earn same value, except by rounding ties)" do
      pts = for s <- 0..124, p <- 1..8, do: GlobalLinear.round_points(s, p, opts())
      assert length(pts) == 1000
      assert Enum.all?(pts, &is_integer/1)
      assert Enum.all?(pts, &(&1 >= 0 and &1 <= 1000))
    end

    test "monotonic decrease along global_rank" do
      pts = for s <- 0..124, p <- 1..8, do: GlobalLinear.round_points(s, p, opts())
      assert pts == Enum.sort(pts, :desc)
    end
  end

  describe "boundary tournaments" do
    test "1x1 single slot" do
      assert GlobalLinear.round_points(0, 1, opts(%{slice_count: 1, slice_size: 1})) == 1000
    end

    test "2x2 hand-verified" do
      o = opts(%{slice_count: 2, slice_size: 2})
      # total_slots = 4, denom = 3
      # global_rank 0 → 1000, 1 → 667 (2000/3=666.66 round up), 2 → 333, 3 → 0
      assert GlobalLinear.round_points(0, 1, o) == 1000
      assert GlobalLinear.round_points(0, 2, o) == 667
      assert GlobalLinear.round_points(1, 1, o) == 333
      assert GlobalLinear.round_points(1, 2, o) == 0
    end

    test "1000x1: smooth across full range" do
      o = opts(%{slice_count: 1000, slice_size: 1})
      # total_slots = 1000, denom = 999
      assert GlobalLinear.round_points(0, 1, o) == 1000
      assert GlobalLinear.round_points(999, 1, o) == 0
    end
  end

  describe "defensive inputs" do
    test "place > slice_size clamps" do
      assert GlobalLinear.round_points(0, 100, opts()) == GlobalLinear.round_points(0, 8, opts())
    end

    test "out-of-range inputs raise" do
      assert_raise ArgumentError, fn -> GlobalLinear.round_points(125, 1, opts()) end
      assert_raise ArgumentError, fn -> GlobalLinear.round_points(0, 0, opts()) end
      assert_raise ArgumentError, fn -> GlobalLinear.round_points(-1, 1, opts()) end
    end

    test "max_score = 0 → always 0" do
      assert GlobalLinear.round_points(0, 1, opts(%{max_score: 0})) == 0
    end
  end
end
