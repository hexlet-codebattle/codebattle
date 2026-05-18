defmodule Codebattle.GroupTournament.Scoring.DiagonalQuadraticTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Scoring.DiagonalQuadratic

  defp opts(overrides \\ %{}) do
    Map.merge(
      %{slice_count: 125, slice_size: 8, max_score: 1000, place_weight: 1},
      Map.new(overrides)
    )
  end

  describe "anchor values for 1000-player tournament (125 slices x 8 places, max_score=1000)" do
    test "slice 0 / 1st earns max_score exactly" do
      assert DiagonalQuadratic.round_points(0, 1, opts()) == 1000
    end

    test "slice 0 / 8th == slice 7 / 1st (R=7 swap equivalence)" do
      assert DiagonalQuadratic.round_points(0, 8, opts()) == 997
      assert DiagonalQuadratic.round_points(7, 1, opts()) == 997
    end

    test "slice 0 / 2nd == slice 1 / 1st (R=1 swap equivalence)" do
      a = DiagonalQuadratic.round_points(0, 2, opts())
      b = DiagonalQuadratic.round_points(1, 1, opts())
      assert a == b
    end

    test "slice 50 / 1st value" do
      assert DiagonalQuadratic.round_points(50, 1, opts()) == 854
    end

    test "slice 100 / 1st value" do
      assert DiagonalQuadratic.round_points(100, 1, opts()) == 417
    end

    test "slice 124 / 1st value" do
      assert DiagonalQuadratic.round_points(124, 1, opts()) == 104
    end

    test "slice 124 / 8th earns 0 (the bottom-corner sink)" do
      assert DiagonalQuadratic.round_points(124, 8, opts()) == 0
    end
  end

  describe "monotonicity invariant" do
    test "for the full 1000-player matrix, points are non-increasing along R" do
      pts =
        for slice_index <- 0..124,
            place <- 1..8 do
          {slice_index + (place - 1), DiagonalQuadratic.round_points(slice_index, place, opts())}
        end

      # All positions with the same R must produce the same points (swap equivalence).
      grouped = Enum.group_by(pts, fn {r, _p} -> r end, fn {_r, p} -> p end)

      for {_r, vals} <- grouped do
        assert length(Enum.uniq(vals)) == 1, "positions with same R should earn same points"
      end

      sorted_by_r =
        grouped
        |> Enum.sort_by(fn {r, _vals} -> r end)
        |> Enum.map(fn {_r, [v | _]} -> v end)

      assert sorted_by_r == Enum.sort(sorted_by_r, :desc)
    end

    test "all 1000 positions return a non-negative integer" do
      for slice_index <- 0..124, place <- 1..8 do
        v = DiagonalQuadratic.round_points(slice_index, place, opts())
        assert is_integer(v)
        assert v >= 0
        assert v <= 1000
      end
    end
  end

  describe "place_weight knob" do
    test "place_weight=2 doubles place spread; slice 0 / 8th has R=14 (not 7)" do
      o = opts(%{place_weight: 2})
      # R=14, R_max = 124 + 7*2 = 138, R_max² = 19044
      # 1000 * (19044 - 196) / 19044 = 1000 * 18848 / 19044 = 989.71... → 990
      assert DiagonalQuadratic.round_points(0, 8, o) == 990
    end

    test "place_weight=3 makes within-slice spread dominate" do
      o = opts(%{place_weight: 3})
      # slice 0 / 1st = max_score
      assert DiagonalQuadratic.round_points(0, 1, o) == 1000

      # slice 0 / 8th (R=21) > slice 7 / 1st (R=7) when place_weight=3
      assert DiagonalQuadratic.round_points(7, 1, o) > DiagonalQuadratic.round_points(0, 8, o)
    end
  end

  describe "boundary tournament: slice_count=1, slice_size=1 (single slot, R_max=0)" do
    test "the one player earns max_score" do
      assert DiagonalQuadratic.round_points(0, 1, opts(%{slice_count: 1, slice_size: 1})) == 1000
    end
  end

  describe "boundary tournament: slice_count=1, slice_size=8" do
    test "1st earns max_score; 8th earns 0" do
      o = opts(%{slice_count: 1, slice_size: 8})
      assert DiagonalQuadratic.round_points(0, 1, o) == 1000
      assert DiagonalQuadratic.round_points(0, 8, o) == 0
    end

    test "all 8 positions are non-negative and monotonic" do
      o = opts(%{slice_count: 1, slice_size: 8})
      pts = for place <- 1..8, do: DiagonalQuadratic.round_points(0, place, o)
      assert pts == Enum.sort(pts, :desc)
      assert Enum.all?(pts, &(&1 >= 0))
    end
  end

  describe "boundary tournament: slice_count=2, slice_size=2 (R_max=2)" do
    test "all 4 positions hand-verified" do
      o = opts(%{slice_count: 2, slice_size: 2})
      # R_max = 1 + 1 = 2, R_max² = 4
      # slice 0 / 1st: R=0, (4 - 0)/4 * 1000 = 1000
      # slice 0 / 2nd: R=1, (4 - 1)/4 * 1000 = 750
      # slice 1 / 1st: R=1, 750 (matches slice 0 / 2nd ✓)
      # slice 1 / 2nd: R=2, 0
      assert DiagonalQuadratic.round_points(0, 1, o) == 1000
      assert DiagonalQuadratic.round_points(0, 2, o) == 750
      assert DiagonalQuadratic.round_points(1, 1, o) == 750
      assert DiagonalQuadratic.round_points(1, 2, o) == 0
    end
  end

  describe "boundary tournament: 125 slices x 16 places" do
    test "1st of slice 0 = max_score, last position = 0" do
      o = opts(%{slice_count: 125, slice_size: 16})
      assert DiagonalQuadratic.round_points(0, 1, o) == 1000
      assert DiagonalQuadratic.round_points(124, 16, o) == 0
    end

    test "R_max = 139" do
      # slice 0 / 16th: R=15. 1000 * (139² - 15²) / 139² = 1000 * (19321 - 225) / 19321
      # = 1000 * 19096 / 19321 = 988.35 → 988
      o = opts(%{slice_count: 125, slice_size: 16})
      assert DiagonalQuadratic.round_points(0, 16, o) == 988
    end
  end

  describe "boundary tournament: 1000 slices x 1 place (everyone in their own slice)" do
    test "smooth quadratic across the full range" do
      o = opts(%{slice_count: 1000, slice_size: 1})
      # R_max = 999
      assert DiagonalQuadratic.round_points(0, 1, o) == 1000
      assert DiagonalQuadratic.round_points(999, 1, o) == 0
      # mid-tournament value
      # slice 500 / 1st: R=500, 1000 * (999² - 500²) / 999² = 1000 * (998001 - 250000) / 998001
      # = 749499.49 / 999 ... wait let me recompute. = 1000 * 748001 / 998001 = 749499.49...
      # Actually: 1000 * (998001 - 250000) = 748001000, / 998001 = 749.499... → 749
      assert DiagonalQuadratic.round_points(500, 1, o) == 749
    end
  end

  describe "defensive inputs" do
    test "place > slice_size is treated as slice_size" do
      o = opts()
      assert DiagonalQuadratic.round_points(0, 100, o) == DiagonalQuadratic.round_points(0, 8, o)
    end

    test "place == 0 raises ArgumentError" do
      assert_raise ArgumentError, ~r/place must be a positive integer/, fn ->
        DiagonalQuadratic.round_points(0, 0, opts())
      end
    end

    test "negative place raises ArgumentError" do
      assert_raise ArgumentError, ~r/place must be a positive integer/, fn ->
        DiagonalQuadratic.round_points(0, -1, opts())
      end
    end

    test "negative slice_index raises ArgumentError" do
      assert_raise ArgumentError, ~r/slice_index must be a non-negative integer/, fn ->
        DiagonalQuadratic.round_points(-1, 1, opts())
      end
    end

    test "slice_index >= slice_count raises ArgumentError" do
      assert_raise ArgumentError, ~r/out of range/, fn ->
        DiagonalQuadratic.round_points(125, 1, opts())
      end
    end

    test "max_score = 0 returns 0 for every position" do
      o = opts(%{max_score: 0})
      assert DiagonalQuadratic.round_points(0, 1, o) == 0
      assert DiagonalQuadratic.round_points(50, 4, o) == 0
      assert DiagonalQuadratic.round_points(124, 8, o) == 0
    end
  end

  describe "large numbers (no integer overflow)" do
    test "max_score = 1_000_000_000 works at all positions" do
      o = opts(%{max_score: 1_000_000_000})
      assert DiagonalQuadratic.round_points(0, 1, o) == 1_000_000_000

      for slice_index <- [0, 50, 100, 124], place <- [1, 4, 8] do
        v = DiagonalQuadratic.round_points(slice_index, place, o)
        assert is_integer(v)
        assert v >= 0
        assert v <= 1_000_000_000
      end
    end
  end

  describe "integer rounding (half-up)" do
    test "results are always integers" do
      for slice_index <- 0..124, place <- 1..8 do
        v = DiagonalQuadratic.round_points(slice_index, place, opts())
        assert is_integer(v)
      end
    end
  end

  describe "max_tournament_score/2" do
    test "returns max_score * slice_rounds_count" do
      assert DiagonalQuadratic.max_tournament_score(5, opts()) == 5000
      assert DiagonalQuadratic.max_tournament_score(0, opts()) == 0
      assert DiagonalQuadratic.max_tournament_score(10, opts(%{max_score: 500})) == 5000
    end
  end
end
