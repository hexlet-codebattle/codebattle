defmodule Codebattle.WaitingRoom.State do
  use TypedStruct

  typedstruct do
    # active or paused
    field(:state, :string, default: "paused")
    field(:groups, {:array, :map}, default: [])
    field(:matched_with_bot, {:array, :map}, default: [])
    field(:min_time_sec, integer(), default: 10)
    field(:min_time_with_bot_sec, integer(), default: 15)
    field(:min_time_with_played_sec, integer(), default: 10)
    field(:name, String.t())
    field(:now, :integer)
    field(:pairs, {:array, :map}, default: [])
    field(:played_pair_ids, MapSet.t())
    field(:players, {:array, :map}, default: [])
    field(:time_step_ms, integer(), default: 900)
    field(:unmatched, {:array, :map}, default: [])
    field(:use_clan?, boolean(), default: false)
    field(:use_match_with_bots?, boolean(), default: true)
    field(:use_played_pairs?, boolean(), default: true)
    field(:use_sequential_tasks?, boolean(), default: true)
    field(:use_score?, boolean(), default: true)
  end
end
