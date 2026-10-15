defmodule Codebattle.GroupTournament.Scoring.GlobalLinear do
  @moduledoc """
  Global rank linear scoring.

  global_rank = slice_index * slice_size + (place - 1)
  total_slots = slice_count * slice_size
  points = round(max_score * (1 - global_rank / (total_slots - 1)))

  Each slot in the tournament gets a unique points value (slice 0 / 1st gets
  `max_score`; slice (S-1) / `slice_size` gets 0). Slice tier and place are
  weighted equally — there is no "swap equivalence" between adjacent slices,
  unlike the diagonal strategies.
  """

  @behaviour Codebattle.GroupTournament.Scoring

  alias Codebattle.GroupTournament.Scoring

  @impl true
  def round_points(slice_index, place, opts) do
    place = Scoring.validate_inputs!(slice_index, place, opts)

    max_score = Map.fetch!(opts, :max_score)
    slice_count = Map.fetch!(opts, :slice_count)
    slice_size = Map.fetch!(opts, :slice_size)

    cond do
      max_score <= 0 ->
        0

      slice_count == 0 ->
        0

      true ->
        global_rank = slice_index * slice_size + (place - 1)
        total_slots = slice_count * slice_size

        case total_slots do
          1 ->
            max_score

          _ ->
            denominator = total_slots - 1
            numerator = max_score * (denominator - global_rank)
            max(0, div_round_half_up(numerator, denominator))
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
