defmodule Codebattle.WaitingRoom.EngineTest do
  use Codebattle.DataCase

  alias Codebattle.WaitingRoom.Engine
  alias Codebattle.WaitingRoom.State

  test "matches players with clans" do
    now = :os.system_time(:seconds)
    joined = now - 5
    pair_with_same_opponent = now - 16
    pair_with_bot = now - 21

    players =
      Enum.shuffle([
        %{id: 1, tasks: 1, score: 1, wr_joined_at: joined, clan_id: 1},
        %{id: 2, tasks: 1, score: 4, wr_joined_at: joined, clan_id: 1},
        %{id: 3, tasks: 1, score: 3, wr_joined_at: joined, clan_id: 2},
        %{id: 4, tasks: 1, score: 5, wr_joined_at: joined, clan_id: 2},
        %{id: 5, tasks: 2, score: 6, wr_joined_at: joined, clan_id: 3},
        %{id: 6, tasks: 2, score: 8, wr_joined_at: joined, clan_id: 4},
        %{id: 7, tasks: 2, score: 9, wr_joined_at: joined, clan_id: 5},
        %{id: 8, tasks: 3, score: 9, wr_joined_at: joined, clan_id: 5},
        %{id: 9, tasks: 3, score: 9, wr_joined_at: joined, clan_id: 6},
        %{id: 10, tasks: 4, score: 9, wr_joined_at: joined, clan_id: 7},
        %{id: 11, tasks: 5, score: 9, wr_joined_at: now, clan_id: 4},
        %{id: 12, tasks: 6, score: 9, wr_joined_at: pair_with_same_opponent, clan_id: 5},
        %{id: 13, tasks: 6, score: 9, wr_joined_at: pair_with_same_opponent, clan_id: 5},
        %{id: 14, tasks: 7, score: 9, wr_joined_at: pair_with_same_opponent, clan_id: 5},
        %{id: 15, tasks: 7, score: 9, wr_joined_at: pair_with_same_opponent, clan_id: 6},
        %{id: 16, tasks: 8, score: 9, wr_joined_at: pair_with_bot, clan_id: 6}
      ])

    state = %State{
      name: "wr",
      state: "active",
      min_time_sec: 3,
      min_time_with_bot_sec: 20,
      min_time_with_played_sec: 15,
      played_pair_ids: MapSet.new([[2, 4], [8, 9], [14, 15]]),
      players: players,
      time_step_ms: 100_000,
      use_clan?: true,
      use_sequential_tasks?: true
    }

    %{
      pairs: pairs,
      players: players,
      played_pair_ids: played_pair_ids,
      matched_with_bot: matched_with_bot
    } = Engine.call(state)

    assert [[1, 4], [2, 3], [6, 7], [14, 15]] == Enum.sort(pairs)
    assert [16] == Enum.sort(matched_with_bot)

    assert [
             %{id: 5, tasks: 2, score: 6, wr_joined_at: joined, clan_id: 3},
             %{id: 8, tasks: 3, score: 9, wr_joined_at: joined, clan_id: 5},
             %{id: 9, tasks: 3, score: 9, wr_joined_at: joined, clan_id: 6},
             %{id: 10, tasks: 4, score: 9, wr_joined_at: joined, clan_id: 7},
             %{id: 11, tasks: 5, score: 9, wr_joined_at: now, clan_id: 4},
             %{id: 12, tasks: 6, score: 9, wr_joined_at: pair_with_same_opponent, clan_id: 5},
             %{id: 13, tasks: 6, score: 9, wr_joined_at: pair_with_same_opponent, clan_id: 5}
           ] == Enum.sort_by(players, & &1.id)

    assert MapSet.new([[1, 4], [2, 3], [2, 4], [6, 7], [8, 9], [14, 15]]) == played_pair_ids
  end

  test "10_000 players with clans" do
    joined = :os.system_time(:seconds) - 5

    players =
      1..10_000
      |> Enum.map(fn id ->
        %{
          id: id,
          tasks: Enum.random(1..30),
          score: Enum.random(1..100),
          wr_joined_at: joined,
          clan_id: Enum.random(1..100)
        }
      end)
      |> Enum.shuffle()

    played_pair_ids = 1..10_000 |> Enum.shuffle() |> Enum.chunk_every(2) |> MapSet.new()

    state = %State{
      name: "wr",
      time_step_ms: 100_000,
      use_clan?: true,
      use_sequential_tasks?: true,
      min_time_sec: 3,
      players: players,
      played_pair_ids: played_pair_ids
    }

    Engine.call(state)
  end
end
