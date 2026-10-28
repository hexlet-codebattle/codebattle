defmodule Codebattle.Game.BotDetection.Evaluation do
  @moduledoc "Evaluate reviewed cases without interpreting complaints as ground truth."

  def summarize(cases) do
    labelled = Enum.filter(cases, &(&1.outcome in ["confirmed_assistance", "legitimate"]))

    counts =
      Enum.frequencies_by(labelled, fn row ->
        {row.outcome, row.score >= 5}
      end)

    tp = Map.get(counts, {"confirmed_assistance", true}, 0)
    fp = Map.get(counts, {"legitimate", true}, 0)
    fn_count = Map.get(counts, {"confirmed_assistance", false}, 0)
    tn = Map.get(counts, {"legitimate", false}, 0)

    %{
      reviewed: length(cases),
      labelled: length(labelled),
      inconclusive: length(cases) - length(labelled),
      true_positive: tp,
      false_positive: fp,
      false_negative: fn_count,
      true_negative: tn,
      precision: ratio(tp, tp + fp),
      recall: ratio(tp, tp + fn_count),
      false_positive_rate: ratio(fp, fp + tn),
      players: labelled |> Enum.map(& &1.user_id) |> Enum.uniq() |> length()
    }
  end

  defp ratio(_numerator, 0), do: nil
  defp ratio(numerator, denominator), do: numerator / denominator
end
