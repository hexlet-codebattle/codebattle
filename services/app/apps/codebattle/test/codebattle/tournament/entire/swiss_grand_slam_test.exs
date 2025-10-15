defmodule Codebattle.Tournament.Entire.SwissGrandSlamTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.PubSub.Message
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.TournamentUserResult

  @decimal100 Decimal.new("100.0")
  @decimal0 Decimal.new("0.0")

  test "works with player who solved all tasks" do
    [%{id: t1_id}, %{id: t2_id}, %{id: t3_id}] = insert_list(3, :task, level: "easy")
    insert(:task_pack, name: "tp", task_ids: [t1_id, t2_id, t3_id])

    creator = insert(:user)

    user1 =
      %{id: u1_id} =
      insert(:user, %{clan_id: 1, clan: "1", name: "1", rating: 1000, points: 0, rank: 10})

    user2 =
      %{id: u2_id} =
      insert(:user, %{clan_id: 2, clan: "2", name: "2", rating: 1000, points: 0, rank: 11})

    {:ok, tournament} =
      Tournament.Context.create(%{
        "break_duration_seconds" => 0,
        "creator" => creator,
        "level" => "easy",
        "name" => "Qualification",
        "players_limit" => 2,
        "ranking_type" => "by_user",
        "rounds_limit" => "3",
        "starts_at" => "2025-02-24T06:00",
        "state" => "waiting_participants",
        "task_pack_name" => "tp",
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "type" => "swiss",
        "use_chat" => "false",
        "use_clan" => "false",
        "user_timezone" => "Etc/UTC"
      })

    Repo.update_all(Tournament, set: [grade: "grand_slam"])
    Tournament.Context.restart(tournament)

    :timer.sleep(100)

    tournament = Tournament.Context.get(tournament.id)
    assert tournament.grade == "grand_slam"

    users = [%{id: p1_id} = user1, user2]

    admin_topic = tournament_admin_topic(tournament.id)
    common_topic = tournament_common_topic(tournament.id)
    player1_topic = tournament_player_topic(tournament.id, p1_id)

    Codebattle.PubSub.subscribe(admin_topic)
    Codebattle.PubSub.subscribe(common_topic)
    Codebattle.PubSub.subscribe(player1_topic)

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})

    Enum.each(users, fn %{id: id, name: name} ->
      assert_received %Message{
        topic: ^common_topic,
        event: "tournament:player:joined",
        payload: %{player: %{name: ^name, id: ^id, state: "active"}}
      }
    end)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    Tournament.Server.handle_event(tournament.id, :start, %{
      user: creator,
      time_step_ms: 20_000,
      min_time_sec: 0
    })

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 0,
          break_state: "off",
          last_round_ended_at: nil,
          last_round_started_at: _
        }
      }
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 0,
          break_state: "off",
          last_round_ended_at: nil,
          last_round_started_at: _
        }
      }
    }

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{task_id: ^t1_id, state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)
    matches = get_matches(tournament)

    assert players_count(tournament) == 2
    assert Enum.count(matches) == 1

    win_active_match(tournament, user1)
    :timer.sleep(100)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{}
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 0,
          break_state: "on"
        }
      }
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 1,
          break_state: "off"
        }
      }
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    :timer.sleep(100)

    tournament = Tournament.Context.get(tournament.id)
    matches = get_matches(tournament)

    assert Enum.count(matches) == 2

    win_active_match(tournament, user1)
    :timer.sleep(200)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{state: "game_over"}, players: [%{}, %{}]}
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{}
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{}
    }

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{}
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)
    win_active_match(tournament, user1)
    :timer.sleep(200)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{state: "game_over"}}
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{}
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{}
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:finished",
      payload: %{
        tournament: %{
          type: "swiss",
          state: "finished",
          current_round_position: 2,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = %{id: tournament_id} = Tournament.Context.get(tournament.id)
    matches = get_matches(tournament)

    assert Enum.count(matches) == 3

    assert tournament.current_round_position == 2

    assert [
             %{
               score: 60,
               clan_id: 1,
               duration_sec: 30,
               game_id: _,
               id: _,
               level: "easy",
               result_percent: @decimal100,
               task_id: ^t1_id,
               tournament_id: ^tournament_id,
               user_id: ^u1_id,
               user_name: "1"
             },
             %{
               score: 60,
               clan_id: 1,
               duration_sec: 30,
               game_id: _,
               id: _,
               level: "easy",
               result_percent: @decimal100,
               task_id: ^t2_id,
               tournament_id: ^tournament_id,
               user_id: ^u1_id,
               user_name: "1"
             },
             %{
               score: 60,
               clan_id: 1,
               duration_sec: 30,
               game_id: _,
               id: _,
               level: "easy",
               result_percent: @decimal100,
               task_id: ^t3_id,
               tournament_id: ^tournament_id,
               user_id: ^u1_id,
               user_name: "1"
             },
             %{
               score: 0,
               clan_id: 2,
               duration_sec: 30,
               game_id: _,
               id: _,
               level: "easy",
               result_percent: @decimal0,
               task_id: ^t1_id,
               tournament_id: ^tournament_id,
               user_id: ^u2_id,
               user_name: "2"
             },
             %{
               score: 0,
               clan_id: 2,
               duration_sec: 30,
               game_id: _,
               id: _,
               level: "easy",
               result_percent: @decimal0,
               task_id: ^t2_id,
               tournament_id: ^tournament_id,
               user_id: ^u2_id,
               user_name: "2"
             },
             %{
               score: 0,
               clan_id: 2,
               duration_sec: 30,
               game_id: _,
               id: _,
               level: "easy",
               result_percent: @decimal0,
               task_id: ^t3_id,
               tournament_id: ^tournament_id,
               user_id: ^u2_id,
               user_name: "2"
             }
           ] = TournamentResult |> Repo.all() |> Enum.sort_by(&{&1.user_id, &1.task_id})

    assert [
             %{
               avg_result_percent: @decimal100,
               clan_id: 1,
               games_count: 3,
               id: _,
               is_cheater: nil,
               place: 1,
               points: 2048,
               score: 180,
               total_time: 90,
               tournament_id: ^tournament_id,
               user_id: ^u1_id,
               user_name: "1",
               wins_count: 3
             },
             %{
               avg_result_percent: @decimal0,
               clan_id: 2,
               games_count: 3,
               id: _,
               is_cheater: nil,
               place: 2,
               points: 1024,
               score: 0,
               total_time: 90,
               tournament_id: ^tournament_id,
               user_id: ^u2_id,
               user_name: "2",
               wins_count: 0
             }
           ] = TournamentUserResult |> Repo.all() |> Enum.sort_by(& &1.user_id)

    :timer.sleep(:timer.seconds(2))
    assert %{rating: 1023, rank: 1, points: 2048} = Repo.get(User, u1_id)
    assert %{rating: 977, rank: 2, points: 1024} = Repo.get(User, u2_id)
  end
end
