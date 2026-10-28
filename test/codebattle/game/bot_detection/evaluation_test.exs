defmodule Codebattle.Game.BotDetection.EvaluationTest do
  use ExUnit.Case, async: true

  alias Codebattle.Game.BotDetection.Evaluation

  test "counts reviewed outcomes and leaves undefined rates empty" do
    assert %{precision: nil, recall: nil, false_positive_rate: nil} = Evaluation.summarize([])

    rows = [
      %{user_id: 1, outcome: "confirmed_assistance", score: 8},
      %{user_id: 2, outcome: "confirmed_assistance", score: 0},
      %{user_id: 3, outcome: "legitimate", score: 8},
      %{user_id: 3, outcome: "legitimate", score: 0},
      %{user_id: 4, outcome: "inconclusive", score: 12}
    ]

    assert %{
             labelled: 4,
             inconclusive: 1,
             true_positive: 1,
             false_positive: 1,
             false_negative: 1,
             true_negative: 1,
             precision: 0.5,
             recall: 0.5,
             false_positive_rate: 0.5,
             players: 3
           } = Evaluation.summarize(rows)
  end
end
