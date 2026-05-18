defmodule Codebattle.GroupTournament.Movement.MirroredCascadeTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Movement.MirroredCascade

  defp opts(overrides \\ %{}) do
    Map.merge(%{slice_count: 125, slice_size: 8}, Map.new(overrides))
  end

  defp result(user_id, slice_index, place) do
    %{user_id: user_id, slice_index: slice_index, place: place}
  end

  defp destination(assignments, user_id) do
    Enum.find_value(assignments, fn %{user_id: u, new_slice_index: d} -> u == user_id && d end)
  end

  describe "standard 125x8 cascade" do
    test "slice 0 / 1st stays in slice 0 (top edge fixed point)" do
      assignments = MirroredCascade.reassign([result(1, 0, 1)], opts())
      assert destination(assignments, 1) == 0
    end

    test "slice 0 / 2..8 cascade to slice P-1" do
      results = for place <- 2..8, do: result(place, 0, place)
      assignments = MirroredCascade.reassign(results, opts())

      for place <- 2..8 do
        assert destination(assignments, place) == place - 1
      end
    end

    test "slice 124 / 8th stays in slice 124 (bottom edge fixed point)" do
      assignments = MirroredCascade.reassign([result(1, 124, 8)], opts())
      assert destination(assignments, 1) == 124
    end

    test "slice 124 / 1st promotes to slice 123" do
      assignments = MirroredCascade.reassign([result(1, 124, 1)], opts())
      assert destination(assignments, 1) == 123
    end

    test "middle slice K, 1st promotes to K-1; place P>1 relegates to K+P-1" do
      k = 50

      results =
        Enum.map(1..8, fn place -> result(place, k, place) end)

      assignments = MirroredCascade.reassign(results, opts())

      assert destination(assignments, 1) == 49

      for place <- 2..8 do
        assert destination(assignments, place) == k + place - 1
      end
    end

    test "slice 118..124 partial overflow: places that would land beyond slice 124 stay put" do
      # slice 118 / 8th would go to 125 → stays in 118.
      # slice 119 / 7th would go to 125 → stays.
      # slice 120 / 6th, 121 / 5th, etc. — same pattern.
      o = opts()

      assert destination(MirroredCascade.reassign([result(1, 118, 8)], o), 1) == 118
      assert destination(MirroredCascade.reassign([result(1, 119, 7)], o), 1) == 119
      assert destination(MirroredCascade.reassign([result(1, 119, 8)], o), 1) == 119
      assert destination(MirroredCascade.reassign([result(1, 124, 2)], o), 1) == 124
    end
  end

  describe "conservation property" do
    test "every input user appears exactly once in output" do
      results =
        for slice_index <- 0..124, place <- 1..8 do
          user_id = slice_index * 8 + place
          result(user_id, slice_index, place)
        end

      assignments = MirroredCascade.reassign(results, opts())

      assert length(assignments) == 1000
      assert length(Enum.uniq_by(assignments, & &1.user_id)) == 1000
    end
  end

  describe "range property" do
    test "every new_slice_index is in [0, slice_count - 1]" do
      results =
        for slice_index <- 0..124, place <- 1..8 do
          result(slice_index * 8 + place, slice_index, place)
        end

      assignments = MirroredCascade.reassign(results, opts())

      assert Enum.all?(assignments, fn %{new_slice_index: d} -> d >= 0 and d <= 124 end)
    end
  end

  describe "boundary tournaments" do
    test "slice_count=1: everybody stays in slice 0 regardless of place" do
      results = for place <- 1..8, do: result(place, 0, place)
      assignments = MirroredCascade.reassign(results, opts(%{slice_count: 1}))

      for %{new_slice_index: d} <- assignments, do: assert(d == 0)
    end

    test "slice_count=2, slice_size=8: edges absorb most movement" do
      o = opts(%{slice_count: 2, slice_size: 8})

      # Slice 0: 1st stays, 2..8 want slices 1..7 — only slice 1 exists, rest clamp to 0
      r0 = for place <- 1..8, do: result(place, 0, place)
      a0 = MirroredCascade.reassign(r0, o)
      assert destination(a0, 1) == 0
      assert destination(a0, 2) == 1
      for place <- 3..8, do: assert(destination(a0, place) == 0)

      # Slice 1: 1st → 0, 2..8 want 2..8 — none exist, all stay in 1
      r1 = for place <- 1..8, do: result(place + 100, 1, place)
      a1 = MirroredCascade.reassign(r1, o)
      assert destination(a1, 101) == 0
      for place <- 2..8, do: assert(destination(a1, place + 100) == 1)
    end

    test "empty input → empty output" do
      assert MirroredCascade.reassign([], opts()) == []
    end
  end

  describe "asymmetric inputs (partial slices)" do
    test "fewer than slice_size players in a slice still apply the rule" do
      results = [
        result(1, 50, 1),
        result(2, 50, 3),
        result(3, 50, 5)
      ]

      assignments = MirroredCascade.reassign(results, opts())

      assert destination(assignments, 1) == 49
      assert destination(assignments, 2) == 52
      assert destination(assignments, 3) == 54
    end

    test "missing places (sparse data) don't crash" do
      # Only places 1, 4, 7 in slice 10
      results = [result(1, 10, 1), result(2, 10, 4), result(3, 10, 7)]

      assignments = MirroredCascade.reassign(results, opts())

      assert destination(assignments, 1) == 9
      assert destination(assignments, 2) == 13
      assert destination(assignments, 3) == 16
    end
  end

  describe "defensive inputs" do
    test "place > slice_size clamped to slice_size" do
      # place 100 should behave like place=8
      a = MirroredCascade.reassign([result(1, 10, 100)], opts())
      assert destination(a, 1) == 10 + 7
    end

    test "place 0 raises ArgumentError" do
      assert_raise ArgumentError, ~r/place/, fn ->
        MirroredCascade.reassign([result(1, 0, 0)], opts())
      end
    end

    test "negative place raises" do
      assert_raise ArgumentError, ~r/place/, fn ->
        MirroredCascade.reassign([result(1, 0, -1)], opts())
      end
    end

    test "slice_index out of range raises" do
      assert_raise ArgumentError, ~r/out of range/, fn ->
        MirroredCascade.reassign([result(1, 125, 1)], opts())
      end
    end

    test "negative slice_index raises" do
      assert_raise ArgumentError, ~r/non-negative/, fn ->
        MirroredCascade.reassign([result(1, -1, 1)], opts())
      end
    end

    test "duplicate user_id raises" do
      results = [result(1, 0, 1), result(1, 5, 2)]

      assert_raise ArgumentError, ~r/duplicate user_id/, fn ->
        MirroredCascade.reassign(results, opts())
      end
    end
  end

  describe "property test: random 1000-player rounds" do
    test "100 random rounds all satisfy invariants" do
      o = opts()

      for _iter <- 1..100 do
        # Build a random round: for each slice, shuffle places 1..8 among 8 user_ids
        for_result =
          for slice_index <- 0..124, place <- 1..8 do
            user_id = slice_index * 8 + place
            result(user_id, slice_index, place)
          end

        results = Enum.shuffle(for_result)

        assignments = MirroredCascade.reassign(results, o)

        # Conservation: every input user is in output, no dupes
        assert length(assignments) == 1000
        users = assignments |> Enum.map(& &1.user_id) |> Enum.sort()
        assert users == Enum.sort(Enum.map(results, & &1.user_id))

        # Range
        for %{new_slice_index: d} <- assignments do
          assert d >= 0 and d <= 124
        end
      end
    end
  end

  describe "monotonicity within a slice" do
    test "a player at a lower place never ends up in a higher slice than someone with a higher place from the same slice" do
      o = opts()
      k = 50

      # In slice 50, places 1..8 → destinations: 49, 51, 52, 53, 54, 55, 56, 57
      results = for place <- 1..8, do: result(place, k, place)
      assignments = MirroredCascade.reassign(results, o)

      destinations = Enum.map(1..8, &destination(assignments, &1))
      # destinations should be: [49, 51, 52, 53, 54, 55, 56, 57]
      assert destinations == [49, 51, 52, 53, 54, 55, 56, 57]
    end
  end
end
