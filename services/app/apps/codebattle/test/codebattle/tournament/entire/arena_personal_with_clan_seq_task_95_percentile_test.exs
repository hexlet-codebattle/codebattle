defmodule Codebattle.Tournament.Entire.ArenaPersonalWithClanSeqTask95PercentTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Event.EventResult
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Ranking.UpdateFromResultsServer
  alias Codebattle.Tournament.TournamentResult

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  @tag :skip
  test "works with several players and single round" do
    [%{id: t1_id}, %{id: t2_id}, %{id: t3_id}] = insert_list(3, :task, level: "easy")
    [%{id: t4_id}, %{id: t5_id}] = insert_list(2, :task, level: "medium")
    [%{id: t6_id}] = insert_list(1, :task, level: "hard")
    insert(:task_pack, name: "tp1", task_ids: [t1_id, t2_id, t3_id])
    insert(:task_pack, name: "tp2", task_ids: [t4_id, t5_id])
    insert(:task_pack, name: "tp3", task_ids: [t6_id])

    [
      %{id: c1_id},
      %{id: c2_id},
      %{id: c3_id},
      %{id: c4_id},
      %{id: c5_id},
      %{id: c6_id},
      %{id: c7_id}
    ] =
      Enum.map(1..7, fn i ->
        insert(:clan, %{name: to_string(i)})
      end)

    event = %{id: e_id} = insert(:event)
    creator = insert(:user)
    user1 = %{id: u1_id} = insert(:user, %{clan_id: c1_id, clan: "1", name: "1"})
    user2 = %{id: u2_id} = insert(:user, %{clan_id: c1_id, clan: "1", name: "2"})
    user3 = insert(:user, %{clan_id: c2_id, clan: "2", name: "3"})
    user4 = insert(:user, %{clan_id: c3_id, clan: "3", name: "4"})
    user5 = insert(:user, %{clan_id: c4_id, clan: "4", name: "5"})
    user6 = insert(:user, %{clan_id: c5_id, clan: "5", name: "6"})
    user7 = insert(:user, %{clan_id: c6_id, clan: "6", name: "7"})
    user8 = insert(:user, %{clan_id: c7_id, clan: "7", name: "8"})

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Personal Clan Arena",
        "event_id" => to_string(event.id),
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp1,tp2,tp3",
        "creator" => creator,
        "break_duration_seconds" => 100,
        "task_provider" => "task_pack_per_round",
        "score_strategy" => "win_loss",
        "task_strategy" => "sequential",
        "ranking_type" => "by_player_95th_percentile",
        "type" => "arena",
        "state" => "waiting_participants",
        "use_clan" => "true",
        "rounds_limit" => "3",
        "players_limit" => 200
      })

    users = [%{id: p1_id} = user1, %{id: p2_id} = user2, user3, user4, user5, user6, user7, user8]

    admin_topic = tournament_admin_topic(tournament.id)
    common_topic = tournament_common_topic(tournament.id)
    player1_topic = tournament_player_topic(tournament.id, p1_id)
    player2_topic = tournament_player_topic(tournament.id, p2_id)

    Codebattle.PubSub.subscribe(admin_topic)
    Codebattle.PubSub.subscribe(common_topic)
    Codebattle.PubSub.subscribe(player1_topic)
    Codebattle.PubSub.subscribe(player2_topic)

    Tournament.Server.handle_event(tournament.id, :join, %{users: users})

    Enum.each(users, fn %{id: id, name: name} ->
      assert_received %Codebattle.PubSub.Message{
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

    assert_received %Codebattle.PubSub.Message{
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

    assert_received %Codebattle.PubSub.Message{
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

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "active",
          task_ids: [^t1_id],
          score: 0,
          wins_count: 0,
          place: 0
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "active",
          task_ids: [^t1_id],
          score: 0,
          wins_count: 0,
          place: 0
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)
    matches = get_matches(tournament)

    assert players_count(tournament) == 8
    assert Enum.count(matches) == 4

    assert %{
             entries: [
               %{id: _, name: _, score: 0, clan: _, place: 1, clan_id: _},
               %{id: _, name: _, score: 0, clan: _, place: 2, clan_id: _},
               %{id: _, name: _, score: 0, clan: _, place: 3, clan_id: _},
               %{id: _, name: _, score: 0, clan: _, place: 4, clan_id: _},
               %{id: _, name: _, score: 0, clan: _, place: 5, clan_id: _},
               %{id: _, name: _, score: 0, clan: _, place: 6, clan_id: _},
               %{id: _, name: _, score: 0, clan: _, place: 7, clan_id: _},
               %{id: _, name: _, score: 0, clan: _, place: 8, clan_id: _}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    ##### user1 win 1 round 1 game
    win_active_match(tournament, user1, %{opponent_percent: 33})

    :timer.sleep(100)
    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{id: ^u1_id, place: 1, score: 100},
               %{place: 2, score: 33},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 3},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 4},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 5},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 6},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 7},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 8}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "matchmaking_active",
          task_ids: [^t1_id],
          score: 3,
          wins_count: 1,
          place: 0
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### user2 win 1 round 1 game
    win_active_match(tournament, user2, %{opponent_percent: 66})
    :timer.sleep(100)

    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{place: 1, score: 100},
               %{place: 2, score: 100},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 5},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 6},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 7},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 8}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "matchmaking_active",
          task_ids: [^t1_id],
          score: 3,
          wins_count: 1,
          place: 0
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)

    players = Tournament.Players.get_players(tournament, "matchmaking_active")
    assert Enum.count(players) == 4

    Tournament.Server.match_waiting_room_players(tournament.id)
    :timer.sleep(100)

    players = Tournament.Players.get_players(tournament, "matchmaking_active")
    assert Enum.empty?(players)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "active",
          task_ids: [^t2_id, ^t1_id],
          score: 3,
          wins_count: 1,
          place: 0
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "active",
          task_ids: [^t2_id, ^t1_id],
          score: 3,
          wins_count: 1,
          place: 0
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    :timer.sleep(100)
    matches = get_matches(tournament)

    assert Enum.count(matches) == 6

    ##### user1 win 1 round 2 game
    win_active_match(tournament, user1)
    :timer.sleep(100)

    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{place: 1, score: 200},
               %{place: 2, score: 100},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 5},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 6},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 7},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 8}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{state: "game_over"}, players: [%{}, %{}]}
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "matchmaking_active",
          task_ids: [^t2_id, ^t1_id],
          score: 6,
          wins_count: 2,
          place: 0
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)
    players = Tournament.Players.get_players(tournament, "matchmaking_active")

    assert Enum.count(players) == 2

    Tournament.Server.update_waiting_room_state(tournament.id, %{
      min_time_with_played_sec: 0
    })

    Tournament.Server.match_waiting_room_players(tournament.id)
    :timer.sleep(100)

    Tournament.Server.update_waiting_room_state(tournament.id, %{
      min_time_with_played_sec: 1000
    })

    players = Tournament.Players.get_players(tournament, "matchmaking_active")
    assert Enum.empty?(players)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "active",
          task_ids: [^t3_id, ^t2_id, ^t1_id],
          score: 6,
          wins_count: 2,
          place: 0
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### user1 win 1 round 3 game
    win_active_match(tournament, user1)
    :timer.sleep(100)

    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{place: 1, score: 300},
               %{place: 2, score: 100},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 5},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 6},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 7},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 8}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:matchmaking_stopped",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "finished_round",
          task_ids: [^t3_id, ^t2_id, ^t1_id],
          score: 9,
          wins_count: 3,
          place: 0
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{state: "game_over"}}
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    matches = get_matches(tournament)

    assert Enum.count(matches) == 7

    assert tournament.current_round_position == 0

    ##### Finish 1 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(100)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:matchmaking_stopped",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "finished_round",
          task_ids: [^t2_id, ^t1_id],
          score: 100,
          wins_count: 1,
          place: 2
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "timeout"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "arena",
          state: "active",
          current_round_position: 0,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          type: "arena",
          state: "active",
          current_round_position: 0,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 0,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### Finish 1 round break/Start 2 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(100)

    assert_received %Codebattle.PubSub.Message{
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

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "active",
          task_ids: [^t4_id],
          score: 300,
          wins_count: 3,
          place: 1
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "active",
          task_ids: [^t4_id],
          score: 100,
          wins_count: 1,
          place: 2
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
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

    assert %{
             entries: [
               %{place: 1, score: 300},
               %{place: 2, score: 100},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 5},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 6},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 7},
               %{id: _, name: _, score: 0, clan: _, clan_id: _, place: 8}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)

    ##### user1 win 2 round 1 game
    win_active_match(tournament, user1, %{opponent_percent: 0})

    :timer.sleep(100)
    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{id: ^u1_id, place: 1, score: 600},
               %{place: 2, score: 100},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{place: 5, score: 0},
               %{place: 6, score: 0},
               %{place: 7, score: 0},
               %{place: 8, score: 0}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "matchmaking_active",
          task_ids: [^t4_id],
          score: 305,
          wins_count: 4,
          place: 1
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### user2 win 2 round 1 game
    win_active_match(tournament, user2)
    :timer.sleep(100)

    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{id: ^u1_id, place: 1, score: 600},
               %{id: ^u2_id, place: 2, score: 400},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{place: 5, score: 0},
               %{place: 6, score: 0},
               %{place: 7, score: 0},
               %{place: 8, score: 0}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:matchmaking_started",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "matchmaking_active",
          task_ids: [^t4_id],
          score: 105,
          wins_count: 2,
          place: 2
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### match players
    Tournament.Server.update_waiting_room_state(tournament.id, %{
      min_time_with_played_sec: 0
    })

    Tournament.Server.match_waiting_room_players(tournament.id)
    :timer.sleep(100)

    Tournament.Server.update_waiting_room_state(tournament.id, %{
      min_time_with_played_sec: 1000
    })

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "active",
          task_ids: [^t5_id, ^t4_id],
          score: 305,
          wins_count: 4,
          place: 1
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "active",
          task_ids: [^t5_id, ^t4_id],
          place: 2,
          wins_count: 2,
          score: 105
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    assert Enum.empty?(players)

    ##### user1 win 2 round 2 game
    win_active_match(tournament, user1)
    :timer.sleep(100)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{match: %{state: "game_over"}, players: [%{}, %{}]}
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:matchmaking_stopped",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "finished_round",
          task_ids: [^t5_id, ^t4_id],
          score: 310,
          wins_count: 5,
          place: 1
        }
      }
    }

    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{place: 1, score: 900, id: ^u1_id},
               %{place: 2, score: 400, id: ^u2_id},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{place: 5, score: 0},
               %{place: 6, score: 0},
               %{place: 7, score: 0},
               %{place: 8, score: 0}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    tournament = Tournament.Context.get(tournament.id)

    ##### Finish 2 round
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(100)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:matchmaking_stopped",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "finished_round",
          task_ids: [^t5_id, ^t4_id],
          score: 400,
          wins_count: 2,
          place: 2
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "timeout"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "arena",
          state: "active",
          current_round_position: 1,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          type: "arena",
          state: "active",
          current_round_position: 1,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          state: "active",
          current_round_position: 1,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### Finish 2 round break/Start 3 round
    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(100)

    assert_received %Codebattle.PubSub.Message{
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

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "active",
          task_ids: [^t6_id],
          score: 900,
          wins_count: 5,
          place: 1
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:match_created",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "active",
          task_ids: [^t6_id],
          score: 400,
          wins_count: 2,
          place: 2
        },
        match: %{state: "playing"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
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

    assert %{
             entries: [
               %{place: 1, score: 900},
               %{place: 2, score: 400},
               %{place: 3, score: 67},
               %{place: 4, score: 33},
               %{place: 5, score: 0},
               %{place: 6, score: 0},
               %{place: 7, score: 0},
               %{place: 8, score: 0}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### user2 win 3 round 1 game
    win_active_match(tournament, user2, %{opponent_percent: 33})

    :timer.sleep(100)
    UpdateFromResultsServer.update(tournament)

    assert %{
             entries: [
               %{id: ^u2_id, place: 1, score: 1400},
               %{id: ^u1_id, place: 2, score: 900},
               %{place: 3, score: 366},
               %{place: 4, score: 67},
               %{place: 5, score: 0},
               %{place: 6, score: 0},
               %{place: 7, score: 0},
               %{place: 8, score: 0}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "game_over"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:player:matchmaking_stopped",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "finished_round",
          task_ids: [^t6_id],
          score: 408,
          wins_count: 3,
          place: 2
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ##### Finish 3 round

    tournament = Tournament.Context.get(tournament.id)
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(100)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:ended",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "finished",
          task_ids: [^t6_id],
          score: 900,
          wins_count: 5,
          place: 2
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player2_topic,
      event: "waiting_room:ended",
      payload: %{
        current_player: %{
          id: ^p2_id,
          state: "finished",
          task_ids: [^t6_id],
          score: 1400,
          wins_count: 3,
          place: 1
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "tournament:match:upserted",
      payload: %{
        match: %{state: "timeout"},
        players: [%{}, %{}]
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^common_topic,
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          type: "arena",
          state: "active",
          current_round_position: 2,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          type: "arena",
          state: "active",
          current_round_position: 2,
          break_state: "on",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^admin_topic,
      event: "tournament:updated",
      payload: %{
        tournament: %{
          state: "finished",
          current_round_position: 2,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _
        }
      }
    }

    assert_received %Codebattle.PubSub.Message{
      topic: ^common_topic,
      event: "tournament:finished",
      payload: %{
        tournament: %{
          break_state: "off",
          current_round_position: 2,
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true,
          state: "finished",
          type: "arena"
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    assert 34 == Repo.count(TournamentResult)

    assert [
             %{
               id: _,
               event_id: ^e_id,
               clan_id: ^c1_id,
               user_id: ^u2_id,
               user_name: "2",
               place: 1,
               score: 1400
             },
             %{
               id: _,
               event_id: ^e_id,
               clan_id: ^c1_id,
               user_id: ^u1_id,
               user_name: "1",
               place: 2,
               score: 900
             },
             %{place: 3, event_id: ^e_id, score: 366},
             %{place: 4, event_id: ^e_id, score: 67},
             %{place: 5, event_id: ^e_id, score: 0},
             %{place: 6, event_id: ^e_id, score: 0},
             %{place: 7, event_id: ^e_id, score: 0},
             %{place: 8, event_id: ^e_id, score: 0}
           ] = EventResult |> Repo.all() |> Enum.sort_by(&{&1.place})
  end
end
