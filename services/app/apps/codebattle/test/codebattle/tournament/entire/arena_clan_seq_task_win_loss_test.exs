defmodule Codebattle.Tournament.Entire.ArenaClanSeqTaskWinLossTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.WaitingRoom

  import Codebattle.Tournament.Helpers
  import Codebattle.TournamentTestHelpers

  test "works with several players and single round" do
    [%{id: t1_id}, %{id: t2_id}, %{id: t3_id}] = insert_list(3, :task, level: "easy")
    insert(:task_pack, name: "tp", task_ids: [t1_id, t2_id, t3_id])

    creator = insert(:user)
    user1 = insert(:user, %{clan_id: 1, clan: "1", name: "1"})
    user2 = insert(:user, %{clan_id: 1, clan: "1", name: "2"})
    user3 = insert(:user, %{clan_id: 2, clan: "3", name: "3"})
    user4 = insert(:user, %{clan_id: 3, clan: "4", name: "4"})
    user5 = insert(:user, %{clan_id: 4, clan: "5", name: "5"})
    user6 = insert(:user, %{clan_id: 5, clan: "6", name: "6"})
    user7 = insert(:user, %{clan_id: 6, clan: "7", name: "7"})
    user8 = insert(:user, %{clan_id: 7, clan: "8", name: "8"})

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Swiss",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "task_provider" => "task_pack_per_round",
        "score_strategy" => "win_loss",
        "task_strategy" => "sequential",
        "ranking_type" => "by_clan",
        "type" => "arena",
        "state" => "waiting_participants",
        "use_clan" => "true",
        "rounds_limit" => "1",
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
        topic: ^admin_topic,
        event: "tournament:player:joined",
        payload: %{player: %{name: ^name, id: ^id, state: "active"}}
      }

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
               %{score: 0, place: 1},
               %{score: 0, place: 2},
               %{score: 0, place: 3},
               %{score: 0, place: 4},
               %{score: 0, place: 5},
               %{score: 0, place: 6},
               %{score: 0, place: 7}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    send_user_win_match(tournament, user1)
    :timer.sleep(100)

    assert %{
             entries: [
               %{score: 3, place: 1, id: 1, players_count: 2},
               %{score: 1, place: 2, players_count: 1},
               %{score: 0, place: 3},
               %{score: 0, place: 4},
               %{score: 0, place: 5},
               %{score: 0, place: 6},
               %{score: 0, place: 7}
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

    send_user_win_match(tournament, user2)
    :timer.sleep(100)

    assert %{
             entries: [
               %{score: 6, place: 1, id: 1, players_count: 2},
               %{score: 1, place: 2, players_count: 1},
               %{score: 1, place: 3, players_count: 1},
               %{score: 0, place: 4},
               %{score: 0, place: 5},
               %{score: 0, place: 6},
               %{score: 0, place: 7}
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

    %{players: players} = WaitingRoom.get_state(tournament.waiting_room_name)
    assert Enum.count(players) == 4

    %{players: players} = WaitingRoom.match_players(tournament.waiting_room_name)
    :timer.sleep(200)

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
    assert Enum.empty?(players)

    :timer.sleep(100)
    matches = get_matches(tournament)

    assert Enum.count(matches) == 6

    send_user_win_match(tournament, user1)
    :timer.sleep(100)

    assert %{
             entries: [
               %{score: 9, place: 1, id: 1, players_count: 2},
               %{score: 2, place: 2, players_count: 1},
               %{score: 1, place: 3, players_count: 1},
               %{score: 0, place: 4},
               %{score: 0, place: 5},
               %{score: 0, place: 6},
               %{score: 0, place: 7}
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
    %{players: players} = WaitingRoom.get_state(tournament.waiting_room_name)
    assert Enum.count(players) == 2
    WaitingRoom.update_state(tournament.waiting_room_name, %{min_time_with_played_sec: 0})

    %{players: players} = WaitingRoom.match_players(tournament.waiting_room_name)
    :timer.sleep(100)

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

    assert Enum.empty?(players)
    send_user_win_match(tournament, user1)
    :timer.sleep(200)

    assert %{
             entries: [
               %{score: 12, place: 1, id: 1, players_count: 2},
               %{score: 3, place: 2, players_count: 1},
               %{score: 1, place: 3, players_count: 1},
               %{score: 0, place: 4},
               %{score: 0, place: 5},
               %{score: 0, place: 6},
               %{score: 0, place: 7}
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
    Tournament.Server.finish_round_after(tournament.id, tournament.current_round_position, 0)
    :timer.sleep(100)

    assert_received %Codebattle.PubSub.Message{
      topic: ^player1_topic,
      event: "waiting_room:ended",
      payload: %{
        current_player: %{
          id: ^p1_id,
          state: "finished",
          task_ids: [^t3_id, ^t2_id, ^t1_id],
          score: 9,
          wins_count: 3,
          place: 0
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
          task_ids: [^t2_id, ^t1_id],
          score: 4,
          wins_count: 1,
          place: 0
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
      topic: ^common_topic,
      event: "tournament:finished",
      payload: %{
        tournament: %{
          type: "arena",
          state: "finished",
          current_round_position: 0,
          break_state: "off",
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
          state: "finished",
          current_round_position: 0,
          break_state: "off",
          last_round_ended_at: _,
          last_round_started_at: _,
          show_results: true
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    assert %{
             entries: [
               %{id: 1, place: 1, players_count: 2, score: 13},
               %{place: 2, players_count: 1},
               %{place: 3, players_count: 1},
               %{place: 4, players_count: 1},
               %{place: 5, players_count: 1},
               %{place: 6, players_count: 1},
               %{place: 7, players_count: 1}
             ]
           } = Tournament.Ranking.get_page(tournament, 1)

    tournament = Tournament.Context.get(tournament.id)

    assert tournament.current_round_position == 0
    matches = get_matches(tournament)

    assert Enum.count(matches) == 7

    assert %{
             entries: [
               %{id: 1, place: 1, players_count: 2, score: 13},
               %{place: 2, players_count: 1},
               %{place: 3, players_count: 1},
               %{place: 4, players_count: 1},
               %{place: 5, players_count: 1},
               %{place: 6, players_count: 1},
               %{place: 7, players_count: 1}
             ],
             page_number: 1,
             page_size: 10,
             total_entries: 7
           } = Tournament.Ranking.get_page(tournament, 1)
  end
end