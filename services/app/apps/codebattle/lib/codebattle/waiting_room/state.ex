defmodule Codebattle.WaitingRoom.State do
  use TypedStruct

  typedstruct do
    field(:name, String.t())
    field(:players, map(), default: [])
    field(:use_clan?, boolean(), default: true)
    field(:time_step_ms, integer(), default: 1_000)
    field(:min_time_ms, integer(), default: 10_000)
    field(:min_time_new_opponent_ms, integer(), default: 50_000)
    field(:max_wait_bot_time_ms, integer(), default: 60_000)
  end
end
