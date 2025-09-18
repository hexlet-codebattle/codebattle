# defmodule Codebattle.Tournament.Entire.SquadSeqTaskOneZeroTest do
#   use Codebattle.DataCase, async: false

#   import Codebattle.Tournament.Helpers
#   import Codebattle.TournamentTestHelpers

#   alias Codebattle.PubSub.Message
#   alias Codebattle.Tournament

#   @tag :skip
#   test "works with several players and single round" do
#     [%{id: t1_id}, %{id: t2_id}] = insert_list(2, :task, level: "easy")
#     [%{id: t3_id}, %{id: t4_id}] = insert_list(2, :task, level: "medium")
#     [%{id: t5_id}, %{id: t6_id}] = insert_list(2, :task, level: "hard")
#     insert(:task_pack, name: "tp1", task_ids: [t1_id, t2_id])
#     insert(:task_pack, name: "tp2", task_ids: [t3_id, t4_id])
#     insert(:task_pack, name: "tp3", task_ids: [t5_id, t6_id])

#     creator = insert(:user)
#     user1 = %{id: u1_id} = insert(:user, %{name: "1"})
#     user2 = %{id: u2_id} = insert(:user, %{name: "2"})
#     user3 = %{id: u3_id} = insert(:user, %{name: "3"})
#     user4 = %{id: u4_id} = insert(:user, %{name: "4"})
#     users = [user1, user2, user3, user4]

#     {:ok, tournament} =
#       Tournament.Context.create(%{
#         "starts_at" => "2022-02-24T06:00",
#         "name" => "Test Clan Arena",
#         "user_timezone" => "Etc/UTC",
#         "level" => "easy",
#         "task_pack_name" => "tp1,tp2,tp3",
#         "creator" => creator,
#         "break_duration_seconds" => "100",
#         "task_provider" => "task_pack_per_round",
#         "task_strategy" => "sequential",
#         "ranking_type" => "void",
#         "type" => "squad",
#         "state" => "waiting_participants",
#         "use_clan" => "false",
#         "rounds_limit" => "3",
#         "players_limit" => 200
#       })

#     admin_topic = tournament_admin_topic(tournament.id)
#     common_topic = tournament_common_topic(tournament.id)
#     player1_topic = tournament_player_topic(tournament.id, u1_id)
#     player2_topic = tournament_player_topic(tournament.id, u2_id)
#     player3_topic = tournament_player_topic(tournament.id, u3_id)
#     player4_topic = tournament_player_topic(tournament.id, u4_id)

#     Codebattle.PubSub.subscribe(admin_topic)
#     Codebattle.PubSub.subscribe(common_topic)
#     Codebattle.PubSub.subscribe(player1_topic)
#     Codebattle.PubSub.subscribe(player2_topic)
#     Codebattle.PubSub.subscribe(player3_topic)
#     Codebattle.PubSub.subscribe(player4_topic)

#     Tournament.Server.handle_event(tournament.id, :join, %{users: users})

#     Enum.each(users, fn %{id: id, name: name} ->
#       assert_received %Message{
#         topic: ^common_topic,
#         event: "tournament:player:joined",
#         payload: %{player: %{name: ^name, id: ^id, state: "active"}}
#       }
#     end)

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     Tournament.Server.handle_event(tournament.id, :start, %{
#       user: creator,
#       time_step_ms: 20_000,
#       min_time_sec: 0
#     })

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 0,
#           break_state: "off",
#           last_round_ended_at: nil,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^common_topic,
#       event: "tournament:round_created",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 0,
#           break_state: "off",
#           last_round_ended_at: nil,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{
#           id: 0,
#           task_id: ^t1_id,
#           player_ids: [^u1_id, ^u2_id]
#         },
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{
#           id: 0,
#           task_id: ^t1_id,
#           player_ids: [^u1_id, ^u2_id]
#         },
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{
#           id: 1,
#           task_id: ^t1_id,
#           player_ids: [^u3_id, ^u4_id]
#         },
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{
#           id: 1,
#           task_id: ^t1_id,
#           player_ids: [^u3_id, ^u4_id]
#         },
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     tournament = Tournament.Context.get(tournament.id)
#     matches = get_matches(tournament)

#     assert players_count(tournament) == 4
#     assert Enum.count(matches) == 2

#     ##### user1 win 1 round 1 game
#     win_active_match(tournament, user1)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 0, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 0, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     ##### user3 win 1 round 1 game
#     win_active_match(tournament, user3)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 1, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 1, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 0,
#           break_state: "off",
#           last_round_ended_at: nil,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 2, task_id: ^t2_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 2, task_id: ^t2_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 3, task_id: ^t2_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 3, task_id: ^t2_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     matches = get_matches(tournament)

#     assert Enum.count(matches) == 4

#     ##### user1 win 1 round 2 game
#     win_active_match(tournament, user1)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 2, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 2, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     tournament = Tournament.Context.get(tournament.id)

#     ##### user3 win 1 round 2 game
#     win_active_match(tournament, user3)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 3, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 3, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^common_topic,
#       event: "tournament:round_finished",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 0,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 0,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 0,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     matches = get_matches(tournament)

#     assert Enum.count(matches) == 4

#     assert tournament.current_round_position == 0

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     tournament = Tournament.Context.get(tournament.id)

#     ##### Finish 1 round break/Start 2 round
#     tournament = Tournament.Context.get(tournament.id)
#     Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^common_topic,
#       event: "tournament:round_created",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 1,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 4, task_id: ^t3_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 4, task_id: ^t3_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 5, task_id: ^t3_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 5, task_id: ^t3_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 1,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     ##### user1 win 2 round 1 game
#     win_active_match(tournament, user1)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{state: "game_over"},
#         players: [%{}, %{}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{state: "game_over"},
#         players: [%{}, %{}]
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     ##### user3 win 2 round 1 game
#     win_active_match(tournament, user3)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{state: "game_over"},
#         players: [%{}, %{}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{state: "game_over"},
#         players: [%{}, %{}]
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 1,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 6, task_id: ^t4_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 6, task_id: ^t4_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 7, task_id: ^t4_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 7, task_id: ^t4_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     matches = get_matches(tournament)

#     assert Enum.count(matches) == 8

#     ##### user1 win 2 round 2 game
#     win_active_match(tournament, user1)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 6, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 6, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     tournament = Tournament.Context.get(tournament.id)

#     ##### user3 win 2 round 2 game
#     win_active_match(tournament, user3)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 7, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 7, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^common_topic,
#       event: "tournament:round_finished",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 1,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 1,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 1,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     tournament = Tournament.Context.get(tournament.id)

#     matches = get_matches(tournament)

#     assert Enum.count(matches) == 8

#     assert tournament.current_round_position == 1

#     ##### Finish 2 round break/Start 3 round
#     Tournament.Server.stop_round_break_after(tournament.id, tournament.current_round_position, 0)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^common_topic,
#       event: "tournament:round_created",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 2,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 8, task_id: ^t5_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 8, task_id: ^t5_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 9, task_id: ^t5_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 9, task_id: ^t5_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 2,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     ##### user1 win 3 round 1 game
#     win_active_match(tournament, user1)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 8, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 8, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     ##### user3 win 3 round 1 game
#     win_active_match(tournament, user3)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 9, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 9, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           state: "active",
#           current_round_position: 2,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 10, task_id: ^t6_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 10, task_id: ^t6_id, player_ids: [^u1_id, ^u2_id]},
#         players: [%{id: ^u1_id}, %{id: ^u2_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 11, task_id: ^t6_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{
#         match: %{id: 11, task_id: ^t6_id, player_ids: [^u3_id, ^u4_id]},
#         players: [%{id: ^u3_id}, %{id: ^u4_id}]
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     matches = get_matches(tournament)

#     assert Enum.count(matches) == 12

#     ##### user1 win 3 round 2 game
#     win_active_match(tournament, user1)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player1_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 10, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player2_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 10, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

#     tournament = Tournament.Context.get(tournament.id)

#     ##### user3 win 3 round 2 game
#     win_active_match(tournament, user3)
#     :timer.sleep(100)

#     assert_received %Message{
#       topic: ^player3_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 11, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^player4_topic,
#       event: "tournament:match:upserted",
#       payload: %{match: %{id: 11, state: "game_over"}, players: [%{}, %{}]}
#     }

#     assert_received %Message{
#       topic: ^common_topic,
#       event: "tournament:round_finished",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 2,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "active",
#           current_round_position: 2,
#           break_state: "on",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^admin_topic,
#       event: "tournament:updated",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "finished",
#           current_round_position: 2,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert_received %Message{
#       topic: ^common_topic,
#       event: "tournament:finished",
#       payload: %{
#         tournament: %{
#           type: "squad",
#           state: "finished",
#           current_round_position: 2,
#           break_state: "off",
#           last_round_ended_at: _,
#           last_round_started_at: _,
#           show_results: true
#         }
#       }
#     }

#     assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}
#   end
# end
