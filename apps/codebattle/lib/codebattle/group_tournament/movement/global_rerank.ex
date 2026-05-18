defmodule Codebattle.GroupTournament.Movement.GlobalRerank do
  @moduledoc """
  Global re-rank slice reassignment.

  Sort all round results by `(slice_index ASC, place ASC)` and re-chunk into
  slices of `slice_size`. The top `slice_size` performers globally go to
  slice 0, the next chunk to slice 1, etc.

  This strategy ignores per-slice swap semantics; it treats a round as a
  global ranking event and rebuilds slices from scratch.
  """

  @behaviour Codebattle.GroupTournament.Movement

  alias Codebattle.GroupTournament.Movement

  @impl true
  def reassign(results, opts) do
    _ = Movement.validate_inputs!(results, opts)

    slice_size = Map.fetch!(opts, :slice_size)

    results
    |> Enum.sort_by(fn %{slice_index: s, place: p, user_id: u} -> {s, p, u} end)
    |> Enum.with_index()
    |> Enum.map(fn {%{user_id: user_id}, position} ->
      %{user_id: user_id, new_slice_index: div(position, slice_size)}
    end)
  end
end
