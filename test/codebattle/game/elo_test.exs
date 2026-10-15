defmodule Codebattle.Game.EloTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.Elo
  alias Codebattle.Game.RatingCalculator

  test "never returns negative ratings for low-rated losers" do
    {winner_rating, loser_rating} = Elo.calc_elo(11, 0, "grand_slam", :win)

    assert winner_rating >= 11
    assert loser_rating == 0
  end

  test "preserves zero-change behavior for open tournaments" do
    assert {0, 0} = Elo.calc_elo(0, 0, "open", :win)
  end

  test "calculates draws and rejects unknown results" do
    assert {1200, 1200} = Elo.calc_elo(1200, 1200, "grand_slam", :draw)

    assert_raise ArgumentError, ~r/result must be :win or :draw/, fn ->
      # Deliberately bypass the public type contract to verify the runtime guard.
      # credo:disable-for-next-line Credo.Check.Refactor.Apply
      apply(Elo, :calc_elo, [1200, 1200, "grand_slam", :loss])
    end
  end

  test "rating calculator handles skipped, drawn, and unmatched games" do
    training = %{mode: "training"}
    solo = %{mode: "standard", type: "solo"}
    unmatched = %{mode: "standard", type: "duo", players: []}

    assert RatingCalculator.call(training) == training
    assert RatingCalculator.call(solo) == solo
    assert RatingCalculator.call(unmatched) == unmatched

    draw = %{
      mode: "standard",
      type: "duo",
      grade: "grand_slam",
      players: [
        %{id: 1, result: "timeout", rating: 1200},
        %{id: 2, result: "timeout", rating: 1200}
      ]
    }

    assert %{players: [first, second]} = RatingCalculator.call(draw)
    assert {first.rating, first.rating_diff} == {1200, 0}
    assert {second.rating, second.rating_diff} == {1200, 0}
  end
end
