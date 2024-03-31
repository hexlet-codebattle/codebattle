defmodule Codebattle.Tournament.TeamTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament

  import Codebattle.Tournament.Helpers

  setup do
    insert(:task, level: "elementary", name: "2")

    :ok
  end

  describe "complete players" do
    test "add bots to complete teams" do
      insert_list(2, :task, level: "easy")
      user1 = insert(:user)
      user2 = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2022-02-24T06:00",
          "name" => "Test Swiss",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => user1,
          "break_duration_seconds" => 0,
          "type" => "team",
          "state" => "waiting_participants",
          "players_limit" => 200,
          "team_1_name" => "1",
          "team_2_name" => "2"
        })

      Tournament.Server.handle_event(tournament.id, :join, %{user: user1, team_id: 0})
      Tournament.Server.handle_event(tournament.id, :join, %{user: user2, team_id: 0})
      Tournament.Server.handle_event(tournament.id, :start, %{user: user1})

      tournament = Tournament.Context.get(tournament.id)

      assert players_count(tournament) == 4
    end
  end
end
