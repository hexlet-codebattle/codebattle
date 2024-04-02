defmodule Codebattle.WaitingRoom.EngineTest do
  use Codebattle.DataCase

  alias Codebattle.WaitingRoom.Engine
  alias Codebattle.WaitingRoom.State

  test "matches players" do
    joined = :os.system_time(:seconds) - 5

    players =
      [
        %{id: 1, tasks: 1, score: 1, joined: joined, clan_id: 1},
        %{id: 2, tasks: 1, score: 4, joined: joined, clan_id: 1},
        %{id: 3, tasks: 1, score: 3, joined: joined, clan_id: 2},
        %{id: 4, tasks: 1, score: 5, joined: joined, clan_id: 2},
        %{id: 5, tasks: 2, score: 6, joined: joined, clan_id: 3},
        %{id: 6, tasks: 2, score: 8, joined: joined, clan_id: 4},
        %{id: 7, tasks: 2, score: 9, joined: joined, clan_id: 5},
        %{id: 8, tasks: 3, score: 9, joined: joined, clan_id: 5},
        %{id: 9, tasks: 3, score: 9, joined: joined, clan_id: 6},
        %{id: 10, tasks: 4, score: 9, joined: joined, clan_id: 7},
        %{id: 19, tasks: 5, score: 9, joined: :os.system_time(:seconds), clan_id: 4}
      ]
      |> Enum.shuffle()

    state = %State{
      name: "wr",
      time_step_ms: 100_000,
      min_time_sec: 3,
      players: players,
      played_pair_ids: MapSet.new([[2, 4], [8, 9]])
    }

    Engine.call(state)
  end

  test "10_000 players" do
    joined = :os.system_time(:seconds) - 5

    players =
      1..10_000
      |> Enum.map(fn id ->
        %{
          id: id,
          tasks: Enum.random(1..30),
          score: Enum.random(1..100),
          joined: joined,
          clan_id: Enum.random(1..100)
        }
      end)
      |> Enum.shuffle()

    played_pair_ids = 1..10_000 |> Enum.shuffle() |> Enum.chunk_every(2) |> MapSet.new()

    state = %State{
      name: "wr",
      time_step_ms: 100_000,
      min_time_sec: 3,
      players: players,
      played_pair_ids: played_pair_ids
    }

    Engine.call(state)
  end
end
