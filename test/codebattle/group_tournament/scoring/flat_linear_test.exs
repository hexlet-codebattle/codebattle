defmodule Codebattle.GroupTournament.Scoring.FlatLinearTest do
  use ExUnit.Case, async: true

  alias Codebattle.GroupTournament.Scoring.FlatLinear

  defp opts(overrides \\ %{}) do
    Map.merge(%{slice_count: 4, slice_size: 3, max_score: 20, place_weight: 1}, overrides)
  end

  test "subtracts three points for each diagonal rank" do
    assert FlatLinear.round_points(0, 1, opts()) == 20
    assert FlatLinear.round_points(0, 2, opts()) == 17
    assert FlatLinear.round_points(1, 1, opts()) == 17
    assert FlatLinear.round_points(3, 3, opts()) == 5
  end

  test "uses a custom place weight and clamps at zero" do
    assert FlatLinear.round_points(1, 3, opts(%{place_weight: 2})) == 5
    assert FlatLinear.round_points(3, 3, opts(%{max_score: 5})) == 0
  end

  test "returns zero for a non-positive maximum" do
    assert FlatLinear.round_points(0, 1, opts(%{max_score: 0})) == 0
    assert FlatLinear.round_points(0, 1, opts(%{max_score: -10})) == 0
  end

  test "validates slice and place inputs" do
    assert_raise ArgumentError, fn -> FlatLinear.round_points(-1, 1, opts()) end
    assert_raise ArgumentError, fn -> FlatLinear.round_points(0, 0, opts()) end
    assert_raise ArgumentError, fn -> FlatLinear.round_points(4, 1, opts()) end
  end

  test "calculates the best possible tournament score" do
    assert FlatLinear.max_tournament_score(4, opts()) == 80
    assert FlatLinear.max_tournament_score(-1, opts()) == 0
    assert FlatLinear.max_tournament_score(4, opts(%{max_score: -1})) == 0
  end
end
