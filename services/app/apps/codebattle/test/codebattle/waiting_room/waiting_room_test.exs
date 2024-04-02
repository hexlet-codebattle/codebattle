defmodule Codebattle.WaitingRoomTest do
  use Codebattle.DataCase

  alias Codebattle.WaitingRoom

  test "matches players" do
    players = [
      %{id: -1, clan_id: 1, score: 1, is_bot: true, task_ids: []},
      %{id: 1, clan_id: 1, score: 1, is_bot: false, task_ids: [1]},
      %{id: 2, clan_id: 1, score: 4, is_bot: false, task_ids: [1]},
      %{id: 3, clan_id: 2, score: 3, is_bot: false, task_ids: [1]},
      %{id: 4, clan_id: 2, score: 5, is_bot: false, task_ids: [1]},
      %{id: 5, clan_id: 3, score: 6, is_bot: false, task_ids: [1, 2]},
      %{id: 5, clan_id: 4, score: 8, is_bot: false, task_ids: [1, 2]}
    ]

    Codebattle.PubSub.subscribe("waiting_room:wr")

    WaitingRoom.start_link(%{name: "wr", time_step_ms: 100_000, min_time_sec: 0})
    WaitingRoom.start("wr", MapSet.new())
    WaitingRoom.put_players("wr", players)
    WaitingRoom.Server.get_state("wr")
    WaitingRoom.Server.match_players("wr")

    assert_receive %Codebattle.PubSub.Message{
      payload: %{pairs: [[5, 5], [3, 1], [4, 2]]}
    }
  end
end
