defmodule Codebattle.GameProcess.Elo do
  @doc """
    Calculates Elo rating

  ## Examples

    iex(1)> Codebattle.GameProcess.Elo.calc_elo(1000, 1000)
    %{loser: 984, winner: 1016}
  
  """
  def calc_elo(winner_rating, loser_rating, k \\ 32) do
    %{
      winner: winner_rating + k * winner_expected(winner_rating, loser_rating) |> round,
      loser: loser_rating + k * loser_expected(winner_rating, loser_rating) |> round
    }
  end
  
  defp transform_rating(rating), do: :math.pow(10, ( rating / 400 ))
  defp winner_expected(r1, r2), do: 1 - ( transform_rating(r1) / ( transform_rating(r1) + transform_rating(r2) ) )
  defp loser_expected(r1, r2), do: 0 - ( transform_rating(r2) / ( transform_rating(r1) + transform_rating(r2) ) )
end
