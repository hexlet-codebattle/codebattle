defmodule Codebattle.Game.EloTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.Elo

  test "never returns negative ratings for low-rated losers" do
    {winner_rating, loser_rating} = Elo.calc_elo(11, 0, "grand_slam", :win)

    assert winner_rating >= 11
    assert loser_rating == 0
  end

  test "preserves zero-change behavior for open tournaments" do
    assert {0, 0} = Elo.calc_elo(0, 0, "open", :win)
  end
end
