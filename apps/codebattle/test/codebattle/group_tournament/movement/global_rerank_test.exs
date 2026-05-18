defmodule Codebattle.GroupTournament.Movement.GlobalRerankTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Movement.GlobalRerank

  defp opts(overrides \\ %{}) do
    Map.merge(%{slice_count: 125, slice_size: 8}, Map.new(overrides))
  end

  defp result(user_id, slice_index, place) do
    %{user_id: user_id, slice_index: slice_index, place: place}
  end

  describe "global re-rank" do
    test "top 8 globally land in slice 0, next 8 in slice 1, etc." do
      # 24 players across 3 source slices; top 8 by (slice, place) → slice 0.
      results =
        for slice_index <- 0..2, place <- 1..8 do
          user_id = slice_index * 8 + place
          result(user_id, slice_index, place)
        end

      o = opts(%{slice_count: 3, slice_size: 8})
      assignments = GlobalRerank.reassign(results, o)
      lookup = Map.new(assignments, &{&1.user_id, &1.new_slice_index})

      # Sorted by (slice, place, user_id) → user 1 first (slice 0 / 1st), user 8 = slice 0/8th.
      assert lookup[1] == 0
      assert lookup[8] == 0
      assert lookup[9] == 1
      assert lookup[16] == 1
      assert lookup[17] == 2
      assert lookup[24] == 2
    end

    test "conservation: every input user appears once in output" do
      results =
        for slice_index <- 0..124, place <- 1..8 do
          result(slice_index * 8 + place, slice_index, place)
        end

      assignments = GlobalRerank.reassign(results, opts())

      assert length(assignments) == 1000
      assert length(Enum.uniq_by(assignments, & &1.user_id)) == 1000
    end

    test "range: all destinations in [0, slice_count - 1]" do
      results =
        for slice_index <- 0..124, place <- 1..8 do
          result(slice_index * 8 + place, slice_index, place)
        end

      assignments = GlobalRerank.reassign(results, opts())

      for %{new_slice_index: d} <- assignments do
        assert d >= 0 and d <= 124
      end
    end
  end

  describe "boundary tournaments" do
    test "slice_count=1, slice_size=8: everyone goes to slice 0" do
      results = for place <- 1..8, do: result(place, 0, place)
      assignments = GlobalRerank.reassign(results, opts(%{slice_count: 1, slice_size: 8}))
      for %{new_slice_index: d} <- assignments, do: assert(d == 0)
    end

    test "empty input → empty output" do
      assert GlobalRerank.reassign([], opts()) == []
    end
  end

  describe "defensive inputs" do
    test "duplicate user_id raises" do
      assert_raise ArgumentError, ~r/duplicate/, fn ->
        GlobalRerank.reassign([result(1, 0, 1), result(1, 1, 2)], opts())
      end
    end

    test "out-of-range slice_index raises" do
      assert_raise ArgumentError, fn ->
        GlobalRerank.reassign([result(1, 125, 1)], opts())
      end
    end
  end
end
