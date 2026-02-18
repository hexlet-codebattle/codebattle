defmodule Codebattle.Game.Elo do
  @moduledoc """
  Elo rating calculator for Codebattle.

  ## Formula

      R_new = R_old + K * (S - E)

  where:
    * `R_old` — current rating
    * `K` — sensitivity factor depending on player's grade
    * `S` — actual score (`1.0` for win, `0.5` for draw, `0.0` for loss)
    * `E` — expected score calculated as:

          E = 1 / (1 + 10^((R_opponent - R_player) / 400))

  ## Function

      calc_elo(winner_rating, loser_rating, grade, result)

  Parameters:
    * `winner_rating` — current rating of the winner
    * `loser_rating` — current rating of the loser
    * `grade` — string grade name (defines K value, see table below)
    * `result` — `:win` or `:draw` (from the winner’s perspective)

  K values by grade:
  | Grade         | K  |
  |---------------|----|
  | "open"        | 0  |
  | "rookie"      | 2  |
  | "challenger"  | 2  |
  | "pro"         | 4  |
  | "elite"       | 4  |
  | "masters"     | 8  |
  | "grand_slam"  | 16 |

  ## Returns

  `{winner_new_rating, loser_new_rating}` — both rounded to integers.

  ## Examples

      iex> Codebattle.Game.Elo.calc_elo(1000, 1000, "rookie", :win)
      {1001, 999}

      iex> Codebattle.Game.Elo.calc_elo(1000, 1000, "rookie", :draw)
      {1000, 1000}

      iex> Codebattle.Game.Elo.calc_elo(1050, 1000, "pro", :win)
      {1052, 998}

      iex> Codebattle.Game.Elo.calc_elo(1050, 1000, "pro", :draw)
      {1050, 1000}

      iex> Codebattle.Game.Elo.calc_elo(1000, 1400, "masters", :win)
      {1007, 1393}

      iex> Codebattle.Game.Elo.calc_elo(1400, 1000, "masters", :win)
      {1401, 999}

      iex> Codebattle.Game.Elo.calc_elo(1200, 1000, "grand_slam", :win)
      {1204, 996}

      iex> Codebattle.Game.Elo.calc_elo(1000, 1200, "grand_slam", :win)
      {1012, 1188}
  """

  @kvalues %{
    "open" => 0,
    "rookie" => 2,
    "challenger" => 2,
    "pro" => 4,
    "elite" => 4,
    "masters" => 8,
    "grand_slam" => 16
  }

  @type grade :: String.t()
  @type rating :: non_neg_integer()
  @type result :: :win | :draw

  @spec calc_elo(rating, rating, grade, result) :: {integer, integer}
  def calc_elo(winner_rating, loser_rating, grade, result) do
    k = Map.get(@kvalues, grade, 0)
    e_winner = expected_score(winner_rating, loser_rating)
    e_loser = expected_score(loser_rating, winner_rating)

    {s_winner, s_loser} =
      case result do
        :win -> {1.0, 0.0}
        :draw -> {0.5, 0.5}
        _ -> raise ArgumentError, "result must be :win or :draw"
      end

    {
      round(winner_rating + k * (s_winner - e_winner)),
      round(loser_rating + k * (s_loser - e_loser))
    }
  end

  defp expected_score(r_player, r_opponent) do
    1.0 / (1.0 + :math.pow(10.0, (r_opponent - r_player) / 400.0))
  end
end
