defmodule Codebattle.GroupTournament.MovementTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Movement

  describe "resolve/1" do
    test "known strategies" do
      assert Movement.resolve("mirrored_cascade") == Movement.MirroredCascade
      assert Movement.resolve("global_rerank") == Movement.GlobalRerank
      assert Movement.resolve("neighbor_ladder") == Movement.NeighborLadder
    end

    test "default" do
      assert Movement.resolve(nil) == Movement.MirroredCascade
      assert Movement.resolve("") == Movement.MirroredCascade
    end

    test "unknown raises" do
      assert_raise ArgumentError, ~r/unknown movement strategy/, fn ->
        Movement.resolve("foo")
      end
    end
  end

  describe "reassign/3 dispatch" do
    test "routes to the configured strategy" do
      results = [%{user_id: 1, slice_index: 0, place: 1}]
      opts = %{slice_count: 1, slice_size: 1}
      assert [%{user_id: 1, new_slice_index: 0}] = Movement.reassign("mirrored_cascade", results, opts)
    end
  end

  describe "strategies/0" do
    test "lists all" do
      assert Enum.sort(Movement.strategies()) ==
               ["global_rerank", "mirrored_cascade", "neighbor_ladder"]
    end
  end
end
