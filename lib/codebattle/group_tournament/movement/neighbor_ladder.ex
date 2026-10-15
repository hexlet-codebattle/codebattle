defmodule Codebattle.GroupTournament.Movement.NeighborLadder do
  @moduledoc """
  Neighbor-ladder slice reassignment.

  For each slice K (0-indexed):
    * Place 1 promotes to slice K - 1 (clamped at slice 0).
    * Place `slice_size` (or higher) relegates to slice K + 1 (clamped at
      slice `slice_count - 1`).
    * Every other place stays in slice K.

  Only two players move per slice per round. Mobility is slow but predictable
  and there are never any size collisions.
  """

  @behaviour Codebattle.GroupTournament.Movement

  alias Codebattle.GroupTournament.Movement

  @impl true
  def reassign(results, opts) do
    _ = Movement.validate_inputs!(results, opts)

    slice_count = Map.fetch!(opts, :slice_count)
    slice_size = Map.fetch!(opts, :slice_size)

    Enum.map(results, fn %{user_id: user_id, slice_index: slice_index, place: place} ->
      destination = compute_destination(slice_index, min(place, slice_size), slice_size, slice_count)
      %{user_id: user_id, new_slice_index: destination}
    end)
  end

  defp compute_destination(slice_index, _place, _slice_size, slice_count) when slice_count <= 1, do: slice_index

  defp compute_destination(slice_index, 1, _slice_size, _slice_count) when slice_index == 0, do: 0
  defp compute_destination(slice_index, 1, _slice_size, _slice_count), do: slice_index - 1

  defp compute_destination(slice_index, place, slice_size, slice_count)
       when place == slice_size and slice_index == slice_count - 1, do: slice_index

  defp compute_destination(slice_index, place, slice_size, slice_count) when place == slice_size do
    min(slice_index + 1, slice_count - 1)
  end

  defp compute_destination(slice_index, _place, _slice_size, _slice_count), do: slice_index
end
