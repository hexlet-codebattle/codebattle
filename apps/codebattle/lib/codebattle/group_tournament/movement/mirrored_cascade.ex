defmodule Codebattle.GroupTournament.Movement.MirroredCascade do
  @moduledoc """
  Mirrored place-cascade slice reassignment.

  For each `(slice_index, place)`:

    * `place == 1` → destination = `slice_index - 1` (promote up by one)
    * `place > 1`  → destination = `slice_index + (place - 1)` (relegate down)

  Edge clamp (the mirror): if the computed destination is `< 0` or
  `>= slice_count`, the player stays in their current slice. This makes
  `(slice 0, place 1)` and `(slice (slice_count - 1), place slice_size)`
  symmetric fixed points.

  Slice sizes may fluctuate round-to-round at the top and bottom edges; the
  caller is expected to bot-fill any slice that ends up below `slice_size`.

  Defensive behaviour:
    * `place > slice_size` is treated as `slice_size` (max relegation).
    * Duplicate `user_id`s in the input raise `ArgumentError`.
    * Out-of-range `slice_index` raises `ArgumentError`.
  """

  @behaviour Codebattle.GroupTournament.Movement

  alias Codebattle.GroupTournament.Movement

  @impl true
  def reassign(results, opts) do
    _ = Movement.validate_inputs!(results, opts)

    slice_count = Map.fetch!(opts, :slice_count)
    slice_size = Map.fetch!(opts, :slice_size)

    Enum.map(results, fn %{user_id: user_id, slice_index: slice_index, place: place} ->
      clamped_place = min(place, slice_size)
      destination = compute_destination(slice_index, clamped_place, slice_count)

      %{user_id: user_id, new_slice_index: destination}
    end)
  end

  defp compute_destination(slice_index, _place, slice_count) when slice_count <= 1, do: slice_index

  defp compute_destination(slice_index, 1, _slice_count) when slice_index == 0, do: 0
  defp compute_destination(slice_index, 1, _slice_count), do: slice_index - 1

  defp compute_destination(slice_index, place, slice_count) do
    proposed = slice_index + (place - 1)

    if proposed >= slice_count do
      slice_index
    else
      proposed
    end
  end
end
