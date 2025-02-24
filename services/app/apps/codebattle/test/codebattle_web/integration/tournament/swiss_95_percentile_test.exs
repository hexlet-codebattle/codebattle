defmodule CodebattleWeb.Integration.Tournament.SwissClan95PercentileTest do
  use Codebattle.IntegrationCase

  alias Codebattle.Tournament
  alias Phoenix.Socket.Broadcast
  alias Phoenix.Socket.Message
  alias Phoenix.Socket.Reply

  test "Swiss round sequential 95_percentile task_pack" do
    %{id: t1_id} = insert(:task, level: "easy")
    %{id: t2_id} = insert(:task, level: "medium")
    %{id: t3_id} = insert(:task, level: "hard")

    insert(:task_pack, name: "tp", task_ids: [t1_id, t2_id, t3_id])
    admin = insert(:user, %{name: "a"})

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Test Swiss 95 percentile",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "task_pack_name" => "tp",
        "creator" => admin,
        "break_duration_seconds" => 0,
        "score_strategy" => "win_loss",
        "task_provider" => "task_pack",
        "task_strategy" => "sequential",
        "ranking_type" => "by_player_95th_percentile",
        "type" => "swiss",
        "state" => "waiting_participants",
        "use_clan" => "false",
        "rounds_limit" => "3",
        "players_limit" => 200
      })

    tournament_topic = "tournament:#{tournament.id}"
    tournament_admin_topic = "tournament_admin:#{tournament.id}"

    # create 8 players for tournament
    user1 = %{id: u1_id} = insert(:user, name: "1")
    user2 = insert(:user, name: "2")
    user3 = insert(:user, name: "3")
    user4 = insert(:user, name: "4")
    user5 = insert(:user, name: "5")
    user6 = insert(:user, name: "6")
    user7 = insert(:user, name: "7")
    user8 = insert(:user, name: "8")

    admin_socket = socket(UserSocket, "user_id", %{user_id: admin.id, current_user: admin})
    socket1 = socket(UserSocket, "user_id", %{user_id: user1.id, current_user: user1})
    socket2 = socket(UserSocket, "user_id", %{user_id: user2.id, current_user: user2})
    socket3 = socket(UserSocket, "user_id", %{user_id: user3.id, current_user: user3})
    socket4 = socket(UserSocket, "user_id", %{user_id: user4.id, current_user: user4})
    socket5 = socket(UserSocket, "user_id", %{user_id: user5.id, current_user: user5})
    socket6 = socket(UserSocket, "user_id", %{user_id: user6.id, current_user: user6})
    socket7 = socket(UserSocket, "user_id", %{user_id: user7.id, current_user: user7})
    socket8 = socket(UserSocket, "user_id", %{user_id: user8.id, current_user: user8})

    {:ok, _response, socket1} = subscribe_and_join(socket1, TournamentChannel, tournament_topic)
    {:ok, _response, socket2} = subscribe_and_join(socket2, TournamentChannel, tournament_topic)
    {:ok, _response, socket3} = subscribe_and_join(socket3, TournamentChannel, tournament_topic)
    {:ok, _response, socket4} = subscribe_and_join(socket4, TournamentChannel, tournament_topic)
    {:ok, _response, socket5} = subscribe_and_join(socket5, TournamentChannel, tournament_topic)
    {:ok, _response, socket6} = subscribe_and_join(socket6, TournamentChannel, tournament_topic)

    Phoenix.ChannelTest.push(socket1, "tournament:join", %{})
    :timer.sleep(10)
    Phoenix.ChannelTest.push(socket2, "tournament:join", %{})
    :timer.sleep(10)
    Phoenix.ChannelTest.push(socket3, "tournament:join", %{})
    :timer.sleep(10)
    Phoenix.ChannelTest.push(socket4, "tournament:join", %{})
    :timer.sleep(10)
    Phoenix.ChannelTest.push(socket5, "tournament:join", %{})
    :timer.sleep(10)
    Phoenix.ChannelTest.push(socket6, "tournament:join", %{})

    # all 6 users got notification about joined player
    Enum.each(1..36, fn _i ->
      assert_receive %Message{
        event: "tournament:player:joined",
        payload: %{
          player: %Tournament.Player{clan_id: _, id: _, name: _, state: "active"},
          tournament: %{players_count: _}
        }
      }
    end)

    {:ok, user_response, socket7} =
      subscribe_and_join(socket7, TournamentChannel, tournament_topic)

    assert %{
             matches: [],
             players: [],
             ranking: %{
               page_size: 10,
               entries: [
                 %{id: _, place: 1, score: 0, name: "1"},
                 %{id: _, place: 2, score: 0, name: "2"},
                 %{id: _, place: 3, score: 0, name: "3"},
                 %{id: _, place: 4, score: 0, name: "4"},
                 %{id: _, place: 5, score: 0, name: "5"},
                 %{id: _, place: 6, score: 0, name: "6"}
               ],
               page_number: 1,
               total_entries: 6
             },
             tournament: %{
               access_type: "public",
               type: "swiss",
               state: "waiting_participants",
               break_state: "off",
               current_round_position: 0
             }
           } = user_response

    Phoenix.ChannelTest.push(socket7, "tournament:join", %{})

    # 7 users got notification about joined player
    Enum.each(1..7, fn _i ->
      assert_receive %Message{
        event: "tournament:player:joined",
        payload: %{
          player: %Tournament.Player{clan_id: _, id: _, name: _, state: "active"},
          tournament: %{players_count: _}
        }
      }

      assert_receive %Message{
        event: "tournament:ranking_update",
        payload: %{ranking: %{}, clans: %{}}
      }
    end)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # admin join to tournament
    {:ok, admin_join_response, admin_socket} =
      subscribe_and_join(admin_socket, TournamentAdminChannel, tournament_admin_topic)

    assert %{
             matches: [],
             players: [%{}, %{}, %{}, %{}, %{}, %{}, %{}],
             ranking: %{
               page_size: 10,
               entries: [
                 %{id: _, place: 1, score: 0, name: "1"},
                 %{id: _, place: 2, score: 0, name: "2"},
                 %{id: _, place: 3, score: 0, name: "3"},
                 %{id: _, place: 4, score: 0, name: "4"},
                 %{id: _, place: 5, score: 0, name: "5"},
                 %{id: _, place: 6, score: 0, name: "6"},
                 %{id: _, place: 7, score: 0, name: "7"}
               ],
               page_number: 1,
               total_entries: 7
             },
             tasks_info: %{},
             tournament: %{
               access_type: "public",
               type: "swiss",
               state: "waiting_participants",
               break_state: "off",
               current_round_position: 0
             }
           } = admin_join_response

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # ----------------
    # Start tournament
    # 1 round
    # ----------------

    Phoenix.ChannelTest.push(admin_socket, "tournament:start", %{})

    :timer.sleep(200)

    # all 7 users and admin got notification about round created
    Enum.each(1..8, fn _i ->
      assert_receive %Message{
        event: "tournament:round_created",
        payload: %{
          tournament: %{
            break_state: "off",
            current_round_position: 0,
            last_round_ended_at: nil,
            # todo use time mock
            last_round_started_at: _
          }
        }
      }
    end)

    # user1 got notification about match created
    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{state: "active"}, %{state: "active"}],
        match: %{player_ids: [^u1_id, _], game_id: game_id, state: "playing"}
      }
    }

    # rest users got notification about match created
    Enum.each(1..6, fn _i ->
      assert_receive %Message{
        event: "tournament:match:upserted",
        payload: %{
          players: [%{state: "active"}, %{state: "active"}],
          match: %{state: "playing"}
        }
      }
    end)

    # admin got notification about round started and tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # user8 join to tournament
    {:ok, _response, socket8} =
      subscribe_and_join(socket8, TournamentChannel, tournament_topic)

    Phoenix.ChannelTest.push(socket8, "tournament:join", %{})

    Enum.each(1..9, fn _i ->
      assert_receive %Message{
        event: "tournament:player:joined",
        payload: %{
          player: %Tournament.Player{id: _, name: "8", state: "active"},
          tournament: %{players_count: 9}
        }
      }
    end)

    assert_receive %Message{
      event: "tournament:ranking_update",
      payload: %{ranking: %{}, clans: %{}}
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    game_topic = "game:#{game_id}"
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # user1 win game
    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: "lol",
      lang_slug: "js"
    })

    assert_receive %Broadcast{
      event: "user:start_check",
      payload: %{user_id: ^u1_id},
      topic: ^game_topic
    }

    assert_receive %Broadcast{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Message{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        match: %{
          player_ids: [^u1_id, _],
          task_id: ^t1_id
        }
      }
    }

    Process.unlink(socket1.channel_pid)
    ref_1 = leave(socket1)
    Phoenix.ChannelTest.assert_reply(ref_1, :ok)
    assert_receive {:socket_close, _, {:shutdown, :left}}

    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{state: "active"}, %{state: "active"}],
        match: %{state: "game_over"}
      },
      topic: ^tournament_topic
    }

    # user1 received wait for next round message
    assert_receive %Message{
      event: "tournament:game:wait",
      payload: %{type: "round"},
      topic: ^game_topic
    }

    :timer.sleep(100)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # ----------------
    # finish 1 round
    # start 2 round
    # ----------------

    Phoenix.ChannelTest.push(admin_socket, "tournament:finish_round", %{})

    :timer.sleep(100)

    # 5 players got match timeout notification
    Enum.each(1..5, fn _i ->
      assert_receive %Message{
        event: "tournament:match:upserted",
        payload: %{
          players: [%{state: "active"}, %{state: "active"}],
          match: %{state: "timeout", task_id: ^t1_id}
        }
      }
    end)

    # 8 users got notification about round finished
    Enum.each(1..8, fn _i ->
      assert_receive %Message{
        event: "tournament:round_finished",
        payload: %{
          tournament: %{
            state: "active",
            break_state: "on",
            current_round_position: 0
          }
        },
        topic: ^tournament_topic
      }
    end)

    # admin got notification round finished
    assert_receive %Message{
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          state: "active",
          break_state: "on",
          current_round_position: 0
        }
      },
      topic: ^tournament_admin_topic
    }

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    # 8 users got notification about round created
    Enum.each(1..8, fn _i ->
      assert_receive %Message{
        event: "tournament:round_created",
        payload: %{
          tournament: %{
            state: "active",
            break_state: "off",
            current_round_position: 1
          }
        },
        topic: ^tournament_topic
      }
    end)

    # admin got notification round created
    assert_receive %Message{
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          break_state: "off",
          current_round_position: 1
        }
      },
      topic: ^tournament_admin_topic
    }

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    :timer.sleep(100)
    # 8 players got notification about new match
    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{id: ^u1_id, state: "active"}, %{state: "active"}],
        match: %{game_id: game_id, state: "playing", task_id: ^t2_id}
      }
    }

    Enum.each(1..7, fn _i ->
      assert_receive %Message{
        event: "tournament:match:upserted",
        payload: %{
          players: [%{state: "active"}, %{state: "active"}],
          match: %{state: "playing", task_id: ^t2_id}
        }
      }
    end)

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # ----------------
    # Check ranking
    # ----------------

    Phoenix.ChannelTest.push(admin_socket, "tournament:ranking:request", %{})

    assert_receive %Reply{
      payload: %{
        ranking: %{
          entries: [
            %{id: 257, score: 100, user_name: "1", place: 1},
            _player2,
            _player3,
            _player4,
            _player5,
            _player6,
            _player7,
            _player8
          ],
          page_number: 1,
          page_size: 10,
          total_entries: 8
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ### finish game in the 2 round
    game_topic = "game:#{game_id}"
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # user1 win game
    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: "lol",
      lang_slug: "js"
    })

    assert_receive %Broadcast{
      event: "user:start_check",
      payload: %{user_id: ^u1_id},
      topic: ^game_topic
    }

    assert_receive %Broadcast{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Message{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        match: %{
          player_ids: [^u1_id, _],
          task_id: ^t2_id
        }
      }
    }

    Process.unlink(socket1.channel_pid)
    ref_1 = leave(socket1)
    Phoenix.ChannelTest.assert_reply(ref_1, :ok)
    assert_receive {:socket_close, _, {:shutdown, :left}}

    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{state: "active"}, %{state: "active"}],
        match: %{state: "game_over"}
      },
      topic: ^tournament_topic
    }

    # user1 received wait for next round message
    assert_receive %Message{
      event: "tournament:game:wait",
      payload: %{type: "round"},
      topic: ^game_topic
    }

    :timer.sleep(100)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # ----------------
    # finish 2 round
    # start 3 round
    # ----------------

    Phoenix.ChannelTest.push(admin_socket, "tournament:finish_round", %{})

    :timer.sleep(100)

    # 5 players got match timeout notification
    Enum.each(1..6, fn _i ->
      assert_receive %Message{
        event: "tournament:match:upserted",
        payload: %{
          players: [%{state: "active"}, %{state: "active"}],
          match: %{state: "timeout", task_id: ^t2_id}
        }
      }
    end)

    # 8 users got notification about round finished
    Enum.each(1..8, fn _i ->
      assert_receive %Message{
        event: "tournament:round_finished",
        payload: %{
          tournament: %{
            state: "active",
            break_state: "on",
            current_round_position: 1
          }
        },
        topic: ^tournament_topic
      }
    end)

    # admin got notification round finished
    assert_receive %Message{
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          state: "active",
          break_state: "on",
          current_round_position: 1
        }
      },
      topic: ^tournament_admin_topic
    }

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    # 8 users got notification about round created
    Enum.each(1..8, fn _i ->
      assert_receive %Message{
        event: "tournament:round_created",
        payload: %{
          tournament: %{
            state: "active",
            break_state: "off",
            current_round_position: 2
          }
        },
        topic: ^tournament_topic
      }
    end)

    # admin got notification round created
    assert_receive %Message{
      event: "tournament:round_created",
      payload: %{
        tournament: %{
          state: "active",
          break_state: "off",
          current_round_position: 2
        }
      },
      topic: ^tournament_admin_topic
    }

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    # 8 players got notification about new match
    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{id: ^u1_id, state: "active"}, %{state: "active"}],
        match: %{game_id: game_id, state: "playing", task_id: ^t3_id}
      }
    }

    Enum.each(1..7, fn _i ->
      assert_receive %Message{
        event: "tournament:match:upserted",
        payload: %{
          players: [%{state: "active"}, %{state: "active"}],
          match: %{state: "playing", task_id: ^t3_id}
        }
      }
    end)

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # ----------------
    # Check ranking
    # ----------------

    Phoenix.ChannelTest.push(admin_socket, "tournament:ranking:request", %{})

    assert_receive %Reply{
      payload: %{
        ranking: %{
          entries: [
            %{id: 257, score: 400, user_name: "1", place: 1},
            _player2,
            _player3,
            _player4,
            _player5,
            _player6,
            _player7,
            _player8,
            _player_bot
          ],
          page_number: 1,
          page_size: 10,
          total_entries: 9
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    ### finish game in the 3 round
    game_topic = "game:#{game_id}"
    {:ok, _response, socket1} = subscribe_and_join(socket1, GameChannel, game_topic)

    # user1 win game
    Phoenix.ChannelTest.push(socket1, "check_result", %{
      editor_text: "lol",
      lang_slug: "js"
    })

    assert_receive %Broadcast{
      event: "user:start_check",
      payload: %{user_id: ^u1_id},
      topic: ^game_topic
    }

    assert_receive %Broadcast{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Message{
      event: "user:check_complete",
      payload: %{user_id: ^u1_id, solution_status: true},
      topic: ^game_topic
    }

    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        match: %{
          player_ids: [^u1_id, _],
          task_id: ^t3_id
        }
      }
    }

    Process.unlink(socket1.channel_pid)
    ref_1 = leave(socket1)
    Phoenix.ChannelTest.assert_reply(ref_1, :ok)
    assert_receive {:socket_close, _, {:shutdown, :left}}

    assert_receive %Message{
      event: "tournament:match:upserted",
      payload: %{
        players: [%{state: "active"}, %{state: "active"}],
        match: %{state: "game_over"}
      },
      topic: ^tournament_topic
    }

    # user1 received wait for next round message
    assert_receive %Message{
      event: "tournament:game:wait",
      payload: %{type: "tournament"},
      topic: ^game_topic
    }

    :timer.sleep(100)

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # ----------------
    # finish 3 round
    # Tournament finished
    # ----------------

    Phoenix.ChannelTest.push(admin_socket, "tournament:finish_round", %{})

    :timer.sleep(100)

    # 5 players got match timeout notification
    Enum.each(1..6, fn _i ->
      assert_receive %Message{
        event: "tournament:match:upserted",
        payload: %{
          players: [%{state: "active"}, %{state: "active"}],
          match: %{state: "timeout", task_id: ^t3_id}
        }
      }
    end)

    # 8 users got notification about round finished
    Enum.each(1..8, fn _i ->
      assert_receive %Message{
        event: "tournament:round_finished",
        payload: %{
          tournament: %{
            state: "active",
            break_state: "on",
            current_round_position: 2
          }
        },
        topic: ^tournament_topic
      }
    end)

    # admin got notification round finished
    assert_receive %Message{
      event: "tournament:round_finished",
      payload: %{
        tournament: %{
          state: "active",
          break_state: "on",
          current_round_position: 2
        }
      },
      topic: ^tournament_admin_topic
    }

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    # 8 users got notification about tournament finished
    Enum.each(1..8, fn _i ->
      assert_receive %Message{
        event: "tournament:finished",
        payload: %{
          tournament: %{
            state: "finished",
            break_state: "off",
            current_round_position: 2
          }
        },
        topic: ^tournament_topic
      }
    end)

    # admin got notification tournament finished
    assert_receive %Message{
      event: "tournament:finished",
      payload: %{
        tournament: %{
          state: "finished",
          break_state: "off",
          current_round_position: 2
        }
      },
      topic: ^tournament_admin_topic
    }

    # admin got notification tournament updated
    assert_receive %Message{
      event: "tournament:update",
      payload: %{tournament: %{}},
      topic: ^tournament_admin_topic
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}

    # ----------------
    # Check ranking
    # ----------------

    Phoenix.ChannelTest.push(admin_socket, "tournament:ranking:request", %{})

    assert_receive %Reply{
      payload: %{
        ranking: %{
          entries: [
            %{id: 257, score: 1400, user_name: "1", place: 1},
            _player2,
            _player3,
            _player4,
            _player5,
            _player6,
            _player7,
            _player8,
            _player_bot
          ],
          page_number: 1,
          page_size: 10,
          total_entries: 9
        }
      }
    }

    assert Process.info(self(), :message_queue_len) == {:message_queue_len, 0}
  end
end
