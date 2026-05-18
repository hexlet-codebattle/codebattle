defmodule Codebattle.GroupTournament.Scoring.DiagonalQuadratic do
  @moduledoc """
  Diagonal quadratic scoring.

  R = slice_index + (place - 1) * place_weight
  R_max = (slice_count - 1) + (slice_size - 1) * place_weight
  points = max(0, round(max_score * (1 - (R / R_max)^2)))

  Properties:
    * slice 0 / 1st earns `max_score` exactly.
    * The last position (slice `slice_count - 1`, place `slice_size`) earns 0.
    * Players who land in the same slice next round via the cascade share R
      (and therefore earn the same points this round), which preserves the
      "swap equivalence" of the mirrored cascade.

  Degenerate inputs are handled defensively:
    * R_max == 0 (single-slot tournament) → returns `max_score` for the only
      legal position and raises on out-of-range slice/place.
    * place > slice_size → treated as slice_size (defensive clamp).
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
          0 -> max_score
          _ -> compute(max_score, r, r_max)
        end
    end
  end

  @impl true
  def max_tournament_score(slice_rounds_count, opts) do
    max_score = Map.fetch!(opts, :max_score)
    max(0, max_score) * max(0, slice_rounds_count)
  end

  defp compute(max_score, r, r_max) do
    # Avoid float by computing (max_score * (r_max^2 - r^2)) / r_max^2 then rounding.
    numerator = max_score * (r_max * r_max - r * r)
    denominator = r_max * r_max

    case div_round_half_up(numerator, denominator) do
      v when v < 0 -> 0
      v -> v
    end
  end

  defp div_round_half_up(numerator, denominator) when denominator > 0 do
    div(numerator * 2 + denominator, 2 * denominator)
  end
end
