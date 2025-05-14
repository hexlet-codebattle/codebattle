defmodule Codebattle.Tournament.Entire.SwissQualificationTimeoutTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.PubSub.Message
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.UserEvent

  @decimal100 Decimal.new("100.0")
  @decimal0 Decimal.new("0.0")

  test "works with single player and timeout" do
    [%{id: t1_id}, %{id: t2_id}, %{id: t3_id}] = insert_list(3, :task, level: "easy")
    insert(:task_pack, name: "tp", task_ids: [t1_id, t2_id, t3_id])

    event =
      insert(:event,
        stages: [
          %{
            slug: "qualification",
            name: "Qualification",
            status: :active,
            type: :tournament,
            playing_type: :single
          }
        ]
      )

    creator = insert(:user)
    user1 = %{id: u1_id} = insert(:user, %{clan_id: 1, clan: "1", name: "1"})

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2025-02-24T06:00",
        "name" => "Qualification",
        "event_id" => to_string(event.id),
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack",
        "score_strategy" => "win_loss",
        "task_strategy" => "sequential",
        "ranking_type" => "by_clan",
        "type" => "swiss",
        "state" => "waiting_participants",
        "use_clan" => "false",
        "use_chat" => "false",
        "rounds_limit" => "3",
        "players_limit" => 2
      })

    insert(:user_event,
      event: event,
      user: user1,
      stages: [
        %{
          slug: "qualification",
          status: :pending,
          place_in_total_rank: nil,
          place_in_category_rank: nil,
          score: nil,
          wins_count: nil,
          games_count: nil,
          tournament_id: tournament.id,
          time_spent_in_seconds: nil
        }
      ]
    )

    users = [%{id: p1_id} = user1]

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

    # win first game
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

    Tournament.Server.handle_event(tournament.id, :finish_tournament, %{})
    :timer.sleep(300)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{state: "timeout"}}
    }

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:finished",
      payload: %{
        tournament: %{
          type: "swiss",
          state: "finished",
          current_round_position: 1,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = %{id: tournament_id} = Tournament.Context.get(tournament.id)
    matches = get_matches(tournament)

    assert Enum.count(matches) == 2

    assert tournament.current_round_position == 1

    assert [
             %{
               score: 3,
               clan_id: 1,
               duration_sec: 0,
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
               score: 1,
               clan_id: 1,
               duration_sec: 0,
               game_id: _,
               id: _,
               level: "easy",
               result_percent: @decimal0,
               task_id: ^t2_id,
               tournament_id: ^tournament_id,
               user_id: ^u1_id,
               user_name: "1"
             }
           ] = TournamentResult |> Repo.all() |> Enum.sort_by(&{&1.user_id, &1.task_id})

    assert %{
             stages: [
               %{
                 finished_at: finished_at,
                 games_count: 3,
                 place_in_category_rank: nil,
                 place_in_total_rank: nil,
                 score: nil,
                 slug: "qualification",
                 started_at: nil,
                 status: :completed,
                 time_spent_in_seconds: 0,
                 tournament_id: ^tournament_id,
                 wins_count: 1
               }
             ]
           } = Repo.one(UserEvent)

    assert finished_at
  end
end
