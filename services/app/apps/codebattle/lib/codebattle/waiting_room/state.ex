defmodule Codebattle.WaitingRoom.State do
  use TypedStruct

  typedstruct do
    field(:name, String.t())
    field(:played_pair_ids, MapSet.t())
    field(:players, map(), default: [])
    field(:use_score?, boolean(), default: true)
    field(:use_clan?, boolean(), default: true)
    field(:use_same_tasks?, boolean(), default: true)
    field(:time_step_ms, integer(), default: 100)
    field(:min_time_sec, integer(), default: 0)
    field(:min_time_new_opponent_ms, integer(), default: 15_000)
    field(:max_wait_bot_time_ms, integer(), default: 20_000)
  end
end
