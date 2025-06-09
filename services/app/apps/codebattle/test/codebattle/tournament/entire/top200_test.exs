defmodule Codebattle.Tournament.Entire.Top200Test do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  alias Codebattle.Event.EventResult
  alias Codebattle.Game
  alias Codebattle.PubSub.Message
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult

  test "works with top200" do
    %{id: t1_id} = insert(:task, level: "easy", name: "t1")
    %{id: t2_id} = insert(:task, level: "easy", name: "t2")
    %{id: t3_id} = insert(:task, level: "easy", name: "t3")
    %{id: t4_id} = insert(:task, level: "easy", name: "t4")
    %{id: t5_id} = insert(:task, level: "easy", name: "t5")
    %{id: t6_id} = insert(:task, level: "easy", name: "t6")
    %{id: t7_id} = insert(:task, level: "easy", name: "t7")
    %{id: t8_id} = insert(:task, level: "easy", name: "t8")
    %{id: t9_id} = insert(:task, level: "easy", name: "t9")
    %{id: t10_id} = insert(:task, level: "easy", name: "t10")
    %{id: t11_id} = insert(:task, level: "easy", name: "t11")
    %{id: t12_id} = insert(:task, level: "easy", name: "t12")
    %{id: t13_id} = insert(:task, level: "easy", name: "t13")
    %{id: t14_id} = insert(:task, level: "easy", name: "t14")

    insert(:task_pack, name: "tp1", task_ids: [t1_id, t2_id])
    insert(:task_pack, name: "tp2", task_ids: [t3_id, t4_id])
    insert(:task_pack, name: "tp3", task_ids: [t5_id, t6_id])
    insert(:task_pack, name: "tp4", task_ids: [t7_id, t8_id])
    insert(:task_pack, name: "tp5", task_ids: [t9_id, t10_id])
    insert(:task_pack, name: "tp6", task_ids: [t11_id, t12_id])
    insert(:task_pack, name: "tp7", task_ids: [t13_id, t14_id])

    creator = insert(:user)
    user1 = %{id: u1_id} = insert(:user, %{clan: "c1", name: "u1", subscription_type: :premium})
    user2 = %{id: u2_id} = insert(:user, %{clan: "c2", name: "u2", subscription_type: :premium})
    user3 = %{id: u3_id} = insert(:user, %{clan: "c3", name: "u3", subscription_type: :premium})
    user4 = %{id: u4_id} = insert(:user, %{clan: "c4", name: "u4", subscription_type: :premium})
    user5 = %{id: u5_id} = insert(:user, %{clan: "c5", name: "u5", subscription_type: :premium})
    user6 = %{id: u6_id} = insert(:user, %{clan: "c6", name: "u6", subscription_type: :premium})
    rest_users = insert_list(194, :user, clan: "c", subscription_type: :premium)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Top 200",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp1,tp2,tp3,tp4,tp5,tp6",
        "creator" => creator,
        "break_duration_seconds" => 100,
        "task_provider" => "task_pack_per_round",
        "task_strategy" => "sequential",
        "round_timeout_seconds" => 100,
        "ranking_type" => "by_percentile",
        "type" => "top200",
        "state" => "waiting_participants",
        "rounds_limit" => "7",
        "use_clan" => "false",
        "players_limit" => 200
      })

    users =
      [
        %{id: u1_id} = user1,
        %{id: u2_id} = user2,
        %{id: u3_id} = user3,
        %{id: u4_id} = user4,
        %{id: u5_id} = user5,
        %{id: u6_id} = user6
      ] ++
        rest_users

    admin_topic = tournament_admin_topic(tournament.id)
    common_topic = tournament_common_topic(tournament.id)
    player1_topic = tournament_player_topic(tournament.id, u1_id)
    player2_topic = tournament_player_topic(tournament.id, u2_id)
    player3_topic = tournament_player_topic(tournament.id, u3_id)
    player4_topic = tournament_player_topic(tournament.id, u4_id)
    player5_topic = tournament_player_topic(tournament.id, u5_id)
    player6_topic = tournament_player_topic(tournament.id, u6_id)

    Codebattle.PubSub.subscribe(admin_topic)
    Codebattle.PubSub.subscribe(common_topic)
    Codebattle.PubSub.subscribe(player1_topic)
    Codebattle.PubSub.subscribe(player2_topic)
    Codebattle.PubSub.subscribe(player3_topic)
    Codebattle.PubSub.subscribe(player4_topic)
    Codebattle.PubSub.subscribe(player5_topic)
    Codebattle.PubSub.subscribe(player6_topic)

    ## JOIN USERS ##
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

    [%{id: game_id1}, %{id: game_id2}, %{id: game_id3}, %{id: game_id4}, %{id: game_id5}, %{id: game_id6} | _] =
      Game
      |> Repo.all()
      |> Enum.sort_by(& &1.id, :asc)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{game_id: ^game_id1, task_id: ^t1_id}}
    }

    assert_received %Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{game_id: ^game_id2, task_id: ^t1_id}}
    }

    assert_received %Message{
      topic: ^player3_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{game_id: ^game_id3, task_id: ^t1_id}}
    }

    assert_received %Message{
      topic: ^player4_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{game_id: ^game_id4, task_id: ^t1_id}}
    }

    assert_received %Message{
      topic: ^player5_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{game_id: ^game_id5, task_id: ^t1_id}}
    }

    assert_received %Message{
      topic: ^player6_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{game_id: ^game_id6, task_id: ^t1_id}}
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)
    matches = get_matches(tournament)

    assert players_count(tournament) == 200
    assert Enum.count(matches) == 100

    assert %{
             entries: [
               %{id: ^u1_id, score: 0, place: 1},
               %{id: ^u2_id, score: 0, place: 2},
               %{id: ^u3_id, score: 0, place: 3},
               %{id: ^u4_id, score: 0, place: 4},
               %{id: ^u5_id, score: 0, place: 5},
               %{id: ^u6_id, score: 0, place: 6} | _rest
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    ##### user1, user2, user3, user4, user5 win 1 round, 1 game
    win_active_match(tournament, user1, %{opponent_percent: 33, duration_sec: 10})
    win_active_match(tournament, user2, %{opponent_percent: 33, duration_sec: 90})
    win_active_match(tournament, user3, %{opponent_percent: 33, duration_sec: 100})
    win_active_match(tournament, user4, %{opponent_percent: 33, duration_sec: 140})
    win_active_match(tournament, user5, %{opponent_percent: 33, duration_sec: 200})

    TournamentResult.upsert_results(tournament)
    Tournament.Ranking.set_ranking(tournament)
    :timer.sleep(200)

    assert %{
             entries: [
               %{place: 1, score: 180, name: "u1"},
               %{place: 2, score: 142, name: "u2"},
               %{place: 3, score: 137, name: "u3"},
               %{place: 4, score: 118, name: "u4"},
               %{place: 5, score: 90, name: "u5"},
               %{place: 6, score: 60},
               %{place: 7, score: 47},
               %{place: 8, score: 46},
               %{place: 9, score: 39},
               %{place: 10, score: 30} | _rest
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id1, state: "game_over", task_id: ^t1_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id2, state: "game_over", task_id: ^t1_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player3_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id3, state: "game_over", task_id: ^t1_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player4_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id4, state: "game_over", task_id: ^t1_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player5_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id5, state: "game_over", task_id: ^t1_id},
        players: [%{}, %{}]
      }
    }

    ### should be rematch with same user
    :timer.sleep(100)

    [%{id: game_id1} | _rest] =
      Game |> Repo.all() |> Enum.filter(&(u1_id in &1.player_ids)) |> Enum.sort_by(& &1.id, :desc)

    [%{id: game_id2} | _rest] =
      Game |> Repo.all() |> Enum.filter(&(u2_id in &1.player_ids)) |> Enum.sort_by(& &1.id, :desc)

    [%{id: game_id3} | _rest] =
      Game |> Repo.all() |> Enum.filter(&(u3_id in &1.player_ids)) |> Enum.sort_by(& &1.id, :desc)

    [%{id: game_id4} | _rest] =
      Game |> Repo.all() |> Enum.filter(&(u4_id in &1.player_ids)) |> Enum.sort_by(& &1.id, :desc)

    [%{id: game_id5} | _rest] =
      Game |> Repo.all() |> Enum.filter(&(u5_id in &1.player_ids)) |> Enum.sort_by(& &1.id, :desc)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id1, state: "playing", task_id: ^t2_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id2, state: "playing", task_id: ^t2_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player3_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id3, state: "playing", task_id: ^t2_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player4_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id4, state: "playing", task_id: ^t2_id},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player5_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id5, state: "playing", task_id: ^t2_id},
        players: [%{}, %{}]
      }
    }

    for _ <- 1..5 do
      assert_received %Message{
        topic: ^admin_topic,
        event: "tournament:updated",
        payload: %{
          tournament: %{}
        }
      }
    end

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### user1 wins 1 round, 2 game
    tournament = Tournament.Context.get(tournament.id)
    win_active_match(tournament, user1, %{opponent_percent: 33, duration_sec: 100})
    win_active_match(tournament, user2, %{opponent_percent: 33, duration_sec: 200})
    win_active_match(tournament, user3, %{opponent_percent: 33, duration_sec: 300})
    win_active_match(tournament, user4, %{opponent_percent: 33, duration_sec: 400})
    win_active_match(tournament, user5, %{opponent_percent: 33, duration_sec: 500})

    :timer.sleep(100)
    TournamentResult.upsert_results(tournament)
    Tournament.Ranking.set_ranking(tournament)
    :timer.sleep(100)

    assert %{
             entries: [
               %{place: 1, score: 580, name: "u1"},
               %{place: 2, score: 492, name: "u2"},
               %{place: 3, score: 437, name: "u3"},
               %{place: 4, score: 368, name: "u4"},
               %{place: 5, score: 290, name: "u5"},
               %{place: 6, score: 193, name: _},
               %{place: 7, score: 164, name: _},
               %{place: 8, score: 146, name: _},
               %{place: 9, score: 122, name: _},
               %{place: 10, score: 97, name: _} | _rest
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id1, state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id2, state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player3_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id3, state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player4_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id4, state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^player5_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{game_id: ^game_id5, state: "game_over"},
        players: [%{}, %{}]
      }
    }

    ### should not be rematch, cause round finished
    :timer.sleep(200)
    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ###### Finish 1 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 0,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 0,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Message{
      topic: ^player6_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "timeout"},
        players: [%{}, %{}]
      }
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 0,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### Finish 1 round break/Start 2 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 1,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 1,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    for _ <- 1..6 do
      assert_received %Message{
        topic: _,
        event: "tournament:match:upserted",
        payload: %{
          match: %{
            state: "playing",
            round_position: 1,
            game_id: _,
            task_id: _,
            player_ids: _
          }
        }
      }
    end

    assert %{
             entries: [
               %{place: 1, score: 580, name: "u1"},
               %{place: 2, score: 492, name: "u2"},
               %{place: 3, score: 437, name: "u3"},
               %{place: 4, score: 368, name: "u4"},
               %{place: 5, score: 290, name: "u5"},
               %{place: 6, score: 193, name: _},
               %{place: 7, score: 164, name: _},
               %{place: 8, score: 146, name: _},
               %{place: 9, score: 122, name: _},
               %{place: 10, score: 97, name: _} | _rest
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    ##### Finish 2 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 1,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 1,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### Start 3 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 2,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    assert_received %Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 2,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    for _ <- 1..6 do
      assert_received %Message{
        topic: _,
        event: "tournament:match:upserted",
        payload: %{
          match: %{
            state: "playing",
            round_position: 2,
            game_id: _,
            task_id: _,
            player_ids: _
          }
        }
      }
    end

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### Round 3 - Win matches
    tournament = Tournament.Context.get(tournament.id)
    win_active_match(tournament, user1, %{opponent_percent: 33, duration_sec: 100})
    win_active_match(tournament, user2, %{opponent_percent: 33, duration_sec: 200})
    win_active_match(tournament, user3, %{opponent_percent: 33, duration_sec: 300})
    win_active_match(tournament, user4, %{opponent_percent: 33, duration_sec: 400})
    win_active_match(tournament, user5, %{opponent_percent: 33, duration_sec: 500})

    :timer.sleep(100)
    TournamentResult.upsert_results(tournament)
    Tournament.Ranking.set_ranking(tournament)
    :timer.sleep(100)

    assert %{
             entries: [
               %{place: 1, score: _, name: "u1"},
               %{place: 2, score: _, name: "u2"},
               %{place: 3, score: _, name: "u3"},
               %{place: 4, score: _, name: "u4"},
               %{place: 5, score: _, name: "u5"} | _rest
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    ##### Finish 3 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 2,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    ##### Start 4 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 3,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    ##### Round 4 - Win matches
    tournament = Tournament.Context.get(tournament.id)
    win_active_match(tournament, user1, %{opponent_percent: 33, duration_sec: 100})
    win_active_match(tournament, user2, %{opponent_percent: 33, duration_sec: 200})
    win_active_match(tournament, user3, %{opponent_percent: 33, duration_sec: 300})
    win_active_match(tournament, user4, %{opponent_percent: 33, duration_sec: 400})
    win_active_match(tournament, user5, %{opponent_percent: 33, duration_sec: 500})

    :timer.sleep(100)
    TournamentResult.upsert_results(tournament)
    Tournament.Ranking.set_ranking(tournament)
    :timer.sleep(100)

    ##### Finish 4 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 3,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    ##### Start 5 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 4,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    ##### Round 5 - Win matches
    tournament = Tournament.Context.get(tournament.id)
    win_active_match(tournament, user1, %{opponent_percent: 33, duration_sec: 100})
    win_active_match(tournament, user2, %{opponent_percent: 33, duration_sec: 200})
    win_active_match(tournament, user3, %{opponent_percent: 33, duration_sec: 300})
    win_active_match(tournament, user4, %{opponent_percent: 33, duration_sec: 400})
    win_active_match(tournament, user5, %{opponent_percent: 33, duration_sec: 500})

    :timer.sleep(100)
    TournamentResult.upsert_results(tournament)
    Tournament.Ranking.set_ranking(tournament)
    :timer.sleep(100)

    ##### Finish 5 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 4,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    ##### Start 6 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 5,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    ##### Round 6 - Win matches
    tournament = Tournament.Context.get(tournament.id)
    win_active_match(tournament, user1, %{opponent_percent: 33, duration_sec: 100})
    win_active_match(tournament, user2, %{opponent_percent: 33, duration_sec: 200})
    win_active_match(tournament, user3, %{opponent_percent: 33, duration_sec: 300})
    win_active_match(tournament, user4, %{opponent_percent: 33, duration_sec: 400})
    win_active_match(tournament, user5, %{opponent_percent: 33, duration_sec: 500})

    :timer.sleep(100)
    TournamentResult.upsert_results(tournament)
    Tournament.Ranking.set_ranking(tournament)
    :timer.sleep(100)

    ##### Finish 6 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "top200",
          state: "active",
          current_round_position: 5,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    ##### Start 7 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 6,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    ##### Round 7 - Win matches
    tournament = Tournament.Context.get(tournament.id)
    win_active_match(tournament, user1, %{opponent_percent: 33, duration_sec: 100})
    win_active_match(tournament, user2, %{opponent_percent: 33, duration_sec: 200})
    win_active_match(tournament, user3, %{opponent_percent: 33, duration_sec: 300})
    win_active_match(tournament, user4, %{opponent_percent: 33, duration_sec: 400})
    win_active_match(tournament, user5, %{opponent_percent: 33, duration_sec: 500})

    :timer.sleep(100)
    TournamentResult.upsert_results(tournament)
    Tournament.Ranking.set_ranking(tournament)
    :timer.sleep(100)

    # Verify final tournament ranking
    assert %{
             entries: [
               %{place: 1, score: _, name: "u1"},
               %{place: 2, score: _, name: "u2"},
               %{place: 3, score: _, name: "u3"},
               %{place: 4, score: _, name: "u4"},
               %{place: 5, score: _, name: "u5"} | _rest
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    ##### Finish 7 round - Tournament should be completed
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(1000)

    assert_received %Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "top200",
          state: "finished",
          current_round_position: 6,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    # Verify tournament is in finished state
    tournament = Tournament.Context.get(tournament.id)
    assert tournament.state == "finished"
    assert tournament.current_round_position == 6
    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}
  end
end
