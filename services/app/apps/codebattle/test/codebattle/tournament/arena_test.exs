defmodule Codebattle.Tournament.ArenaTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament

  import Codebattle.Tournament.Helpers

  setup do
    tasks = insert_list(3, :task, level: "easy")
    insert(:task_pack, name: "tp", task_ids: Enum.map(tasks, & &1.id))

    :ok
  end

  test "add bots to complete teams" do
    user1 = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Swiss",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp",
        "creator" => user1,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack_per_round",
        "task_strategy" => "sequential",
        "type" => "arena",
        "state" => "waiting_participants",
        "use_clan" => "true",
        "rounds_limit" => "3",
        "players_limit" => 200
      })

    Tournament.Server.handle_event(tournament.id, :join, %{user: user1})
    Tournament.Server.handle_event(tournament.id, :start, %{user: user1})

    tournament = Tournament.Context.get(tournament.id)

    assert players_count(tournament) == 2

    assert [
             %{
               duration_sec: nil,
               finished_at: nil,
               game_id: _,
               id: 0,
               level: "easy",
               player_ids: [_, _],
               player_results: %{},
               round_id: _,
               round_position: 0,
               started_at: ~N[2019-01-05 19:11:45],
               state: "playing",
               winner_id: nil
             }
           ] = get_matches(tournament)
  end
end
