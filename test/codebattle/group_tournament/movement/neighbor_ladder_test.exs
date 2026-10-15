defmodule Codebattle.GroupTournament.Movement.NeighborLadderTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Movement.NeighborLadder

  defp opts(overrides \\ %{}) do
    Map.merge(%{slice_count: 125, slice_size: 8}, Map.new(overrides))
  end

  defp result(user_id, slice_index, place) do
    %{user_id: user_id, slice_index: slice_index, place: place}
  end

  defp destination(assignments, user_id) do
    Enum.find_value(assignments, fn %{user_id: u, new_slice_index: d} -> u == user_id && d end)
  end

  describe "neighbor ladder" do
    test "1st promotes to K-1, last relegates to K+1, middle stays" do
      k = 50

      results =
        Enum.map(1..8, fn place -> result(place, k, place) end)

      assignments = NeighborLadder.reassign(results, opts())

      assert destination(assignments, 1) == 49
      for place <- 2..7, do: assert(destination(assignments, place) == 50)
      assert destination(assignments, 8) == 51
    end

    test "top slice / 1st stays at slice 0" do
      assignments = NeighborLadder.reassign([result(1, 0, 1)], opts())
      assert destination(assignments, 1) == 0
    end

    test "bottom slice / last stays at slice (slice_count-1)" do
      assignments = NeighborLadder.reassign([result(1, 124, 8)], opts())
      assert destination(assignments, 1) == 124
    end
  end

  describe "conservation and range" do
    test "125x8 random round preserves all users and stays in range" do
      results =
        for slice_index <- 0..124, place <- 1..8 do
          result(slice_index * 8 + place, slice_index, place)
        end

      assignments = NeighborLadder.reassign(results, opts())

      assert length(assignments) == 1000
      for %{new_slice_index: d} <- assignments, do: assert(d >= 0 and d <= 124)
    end
  end

  describe "boundary tournaments" do
    test "slice_count=1: nobody moves" do
      results = for place <- 1..8, do: result(place, 0, place)
      assignments = NeighborLadder.reassign(results, opts(%{slice_count: 1}))
      for %{new_slice_index: d} <- assignments, do: assert(d == 0)
    end

    test "empty input → empty output" do
      assert NeighborLadder.reassign([], opts()) == []
    end
  end

  describe "defensive inputs" do
    test "duplicate user_id raises" do
      assert_raise ArgumentError, fn ->
        NeighborLadder.reassign([result(1, 0, 1), result(1, 1, 2)], opts())
      end
    end
  end
end
