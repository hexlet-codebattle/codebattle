defmodule Codebattle.Tournament.HelperTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Tournament

  test "render tournament" do
    tasks = insert_list(3, :task, level: "easy")
    insert(:task_pack, name: "tp", task_ids: Enum.map(tasks, & &1.id))
    user1 = insert(:user)
    rest_users = insert_list(199, :user, clan: "c", subscription_type: :premium)
    users = [user1 | rest_users]

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Swiss",
        "description" => "Test Swiss description",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp",
        "creator" => user1,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_clan",
        "type" => "swiss",
        "state" => "waiting_participants",
        "use_clan" => "true",
        "rounds_limit" => "3",
        "players_limit" => 200
      })

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})
    Tournament.Server.handle_event(tournament.id, :start, %{user: user1})

    tournament = Tournament.Context.get(tournament.id)

    assert players_count(tournament) == 200

    assert %{} = get_player_ranking_stats(tournament)
  end

  test "public_meta drops game pass codes" do
    assert public_meta(%{game_passwords: ["secret"], players_redirect_url: "https://hexlet.io"}) ==
             %{players_redirect_url: "https://hexlet.io"}

    assert public_meta(nil) == %{}
  end

  test "prepare_to_json does not expose game pass codes" do
    tournament = %Tournament{meta: %{game_passwords: ["secret"], bot_id: 7}, current_round_timeout_seconds: 60}

    assert prepare_to_json(tournament).meta == %{bot_id: 7}
  end
end
