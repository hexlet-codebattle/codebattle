defmodule Codebattle.GroupTournament.Scoring.DiagonalLinear do
  @moduledoc """
  Diagonal linear scoring.

  R = slice_index + (place - 1) * place_weight
  R_max = (slice_count - 1) + (slice_size - 1) * place_weight
  points = round(max_score * (1 - R / R_max))

  Same "swap equivalence" as DiagonalQuadratic: positions on the same R-diagonal
  earn equal points. Flatter than the quadratic — bottom slices still earn a
  meaningful share of the max.
  """

  @behaviour Codebattle.GroupTournament.Scoring

  alias Codebattle.GroupTournament.Scoring

  @impl true
  def round_points(slice_index, place, opts) do
    place = Scoring.validate_inputs!(slice_index, place, opts)

    max_score = Map.fetch!(opts, :max_score)
    slice_count = Map.fetch!(opts, :slice_count)
    slice_size = Map.fetch!(opts, :slice_size)
    place_weight = Map.get(opts, :place_weight, 1)

    cond do
      max_score <= 0 ->
        0

      slice_count == 0 ->
        0

      true ->
        r = slice_index + (place - 1) * place_weight
        r_max = slice_count - 1 + (slice_size - 1) * place_weight

        case r_max do
          0 ->
            max_score

          _ ->
            numerator = max_score * (r_max - r)
            max(0, div_round_half_up(numerator, r_max))
        end
    end
  end

  @impl true
  def max_tournament_score(slice_rounds_count, opts) do
    max_score = Map.fetch!(opts, :max_score)
    max(0, max_score) * max(0, slice_rounds_count)
  end

  defp div_round_half_up(numerator, denominator) when denominator > 0 do
    div(numerator * 2 + denominator, 2 * denominator)
  end
end
