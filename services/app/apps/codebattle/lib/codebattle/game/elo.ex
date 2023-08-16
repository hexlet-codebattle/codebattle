defmodule Codebattle.Game.Elo do
  @moduledoc """
    Elo
  """

  @kvalues %{
    "elementary" => 16,
    "easy" => 24,
    "medium" => 32,
    "hard" => 40
  }

  @doc """
    Calculates Elo rating

  ## Examples

    iex(1)> Codebattle.Game.Elo.calc_elo(1000, 1000, "elementary")
    {1016, 984}

  """
  def calc_elo(winner_rating, loser_rating, level \\ "medium") do
    {
      round(winner_rating + @kvalues[level] * winner_expected(winner_rating, loser_rating)),
      round(loser_rating + @kvalues[level] * loser_expected(winner_rating, loser_rating))
    }
  end

  defp transform_rating(rating), do: :math.pow(10, rating / 400)

  defp winner_expected(r1, r2),
    do: 1 - transform_rating(r1) / (transform_rating(r1) + transform_rating(r2))

  defp loser_expected(r1, r2),
    do: 0 - transform_rating(r2) / (transform_rating(r1) + transform_rating(r2))
end
