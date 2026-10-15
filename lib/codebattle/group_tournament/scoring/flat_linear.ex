defmodule Codebattle.GroupTournament.Scoring.FlatLinear do
  @moduledoc """
  Flat linear scoring with a fixed per-rank decrement.

  R      = slice_index + (place - 1) * place_weight
  points = max(0, max_score - @step * R)

  Each unit of R costs exactly `@step` points regardless of `max_score`,
  `slice_count`, or `slice_size`. Preserves diagonal swap-equivalence
  (same R ⇒ same points) like the other `diagonal_*` strategies.
  """

  @behaviour Codebattle.GroupTournament.Scoring

  alias Codebattle.GroupTournament.Scoring

  @step 3

  @impl true
  def round_points(slice_index, place, opts) do
    place = Scoring.validate_inputs!(slice_index, place, opts)

    max_score = Map.fetch!(opts, :max_score)
    place_weight = Map.get(opts, :place_weight, 1)

    if max_score <= 0 do
      0
    else
      r = slice_index + (place - 1) * place_weight
      max(0, max_score - @step * r)
    end
  end

  @impl true
  def max_tournament_score(slice_rounds_count, opts) do
    max_score = Map.fetch!(opts, :max_score)
    max(0, max_score) * max(0, slice_rounds_count)
  end
end
