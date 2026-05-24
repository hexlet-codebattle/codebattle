defmodule Codebattle.GroupTournament.ScoringTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Scoring

  describe "resolve/1" do
    test "diagonal_quadratic" do
      assert Scoring.resolve("diagonal_quadratic") == Scoring.DiagonalQuadratic
    end

    test "diagonal_linear" do
      assert Scoring.resolve("diagonal_linear") == Scoring.DiagonalLinear
    end

    test "global_linear" do
      assert Scoring.resolve("global_linear") == Scoring.GlobalLinear
    end

    test "nil and empty default to diagonal_quadratic" do
      assert Scoring.resolve(nil) == Scoring.DiagonalQuadratic
      assert Scoring.resolve("") == Scoring.DiagonalQuadratic
    end

    test "unknown strategy raises" do
      assert_raise ArgumentError, ~r/unknown scoring strategy/, fn ->
        Scoring.resolve("nope")
      end
    end
  end

  describe "round_points/4 dispatch" do
    test "dispatches to the configured strategy" do
      opts = %{slice_count: 2, slice_size: 2, max_score: 1000, place_weight: 1}
      assert Scoring.round_points("diagonal_quadratic", 0, 1, opts) == 1000
      assert Scoring.round_points("diagonal_linear", 0, 1, opts) == 1000
      assert Scoring.round_points("global_linear", 0, 1, opts) == 1000
    end
  end

  describe "strategies/0" do
    test "lists all known strategy names" do
      assert Enum.sort(Scoring.strategies()) ==
               ["diagonal_linear", "diagonal_quadratic", "flat_linear", "global_linear"]
    end
  end
end
